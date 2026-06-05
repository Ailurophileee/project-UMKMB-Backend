import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    // Membaca ID warung milik user yang sedang login dari muatan token JWT
    const idWarungSipemilik = req.user.id_warung; 

    //hari_dalam_minggu = tanggal.dt.dayofweek (0=Senin, 6=Minggu)
    //id_transaksi
    //jam_encoded = jam_transaksi.hour (0-23)
    //kategori
    //nominal
    //rasio_vs_baseline
    // -> Rolling mean 7 hari per kategori per warung sebagai baseline
    // -> Rasio nominal terhadap rolling mean (seberapa jauh dari baseline)
    //rolling_mean_7d = nominal.rolling(7).mean() per kategori
    const queryStr = `
      SELECT
        id_transaksi,
        kategori,
        nominal,
        tanggal,
        HOUR(tanggal) as jam_encoded,
        WEEKDAY(tanggal) as hari_dalam_minggu,
        (
          SELECT COALESCE(AVG(t2.nominal), t1.nominal)
          FROM transaksi t2
          WHERE t2.id_warung = t1.id_warung 
            AND t2.kategori = t1.kategori 
            AND t2.jenis = 'Pengeluaran'
            AND t2.tanggal <= t1.tanggal
          ORDER BY t2.tanggal DESC
          LIMIT 7
        ) as rolling_mean_7d
      FROM transaksi t1
      WHERE t1.id_warung = ? AND t1.jenis = 'Pengeluaran'
      ORDER BY t1.tanggal DESC
    `;

    db.query(queryStr, [idWarungSipemilik], async (err, results) => {
      if (err) return next(err);

      if (!results || results.length === 0) {
        return response(res, 200, 'Belum ada data transaksi pengeluaran untuk dianalisis.', { anomali: [] });
      }
      
      //format dan hitung rasio terhadap baseline sesuai keinginan TIM AI
      const transaksiFormatted = results.map(row => {
        const nominal = parseFloat(row.nominal) || 0;
        const rollingMean = parseFloat(row.rolling_mean_7d) || nominal; // fallback ke nominal sendiri jika data < 7
        
        // Rasio nominal terhadap rolling mean (seberapa jauh dari baseline)
        const rasioVsBaseline = rollingMean > 0 ? parseFloat((nominal / rollingMean).toFixed(2)) : 1.0;

        return {
          id_transaksi: String(row.id_transaksi),
          kategori: row.kategori || 'Lain-lain',
          nominal: nominal,
          hari_dalam_minggu: parseInt(row.hari_dalam_minggu),
          jam_encoded: parseInt(row.jam_encoded),
          rolling_mean_7d: parseFloat(rollingMean.toFixed(2)),
          rasio_vs_baseline: rasioVsBaseline
        };
      });

      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';

        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: transaksiFormatted
        });

        // 1. Ambil data mentah hasil komputasi model AI milik temanmu
        const dataMentahAI = responseDariAI.data.anomali || responseDariAI.data; 

        // 2. Lakukan mapping untuk memberikan label tegas 'ANOMALI' atau 'NORMAL' sesuai standar kodinganmu
        const transaksiTerklasifikasi = dataMentahAI.map((tx) => {
          // KUNCI UTAMA: Jika anomaly_score NEGATIF (< 0), dia WAJIB menyandang status ANOMALI!
          const isAnomaly = tx.anomaly_score < 0;

          return {
            id_transaksi: tx.id_transaksi,
            kategori: tx.kategori || 'Operasional',
            nominal: tx.nominal,
            // Format angka desimal agar cantik di UI laptopmu
            baseline_rata_rata: `${((tx.rasio_vs_baseline || 1) * 100).toFixed(1)}%`,
            status_audit: isAnomaly ? 'ANOMALI' : 'NORMAL',
            hasil_analisis: isAnomaly 
              ? 'Terdeteksi pengeluaran melonjak tidak wajar di luar batas baseline mingguan!' 
              : 'Transaksi aman dan tercatat sesuai batas wajar.'
          };
        });

        // 3. Kembalikan data yang sudah matang dan terklasifikasi ke Frontend React
        return response(res, 200, 'Analisis anomali transaksi berhasil diproses oleh AI', {
          anomali: transaksiTerklasifikasi
        });
       
      } catch (errorAI) {
        console.error('Error dari AI Service:', errorAI.message);
        return res.status(502).json({
          status: 'fail',
          message: 'Gagal mendapatkan analisis dari server AI Railway. Pastikan layanan di cloud sudah aktif.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};