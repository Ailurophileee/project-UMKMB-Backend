import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    // 1. Ambil ID warung dari token JWT user yang login
    const idWarungSipemilik = req.user.id_warung; 

    // Query SQL asli andalanmu untuk menarik riwayat pengeluaran
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
      
      // 2. Format data input agar MATCH 100% dengan JSON Example Request tim AI
      const transaksiFormatted = results.map(row => {
        const nominal = parseFloat(row.nominal) || 0;
        const rollingMean = parseFloat(row.rolling_mean_7d) || nominal; 
        const rasioVsBaseline = rollingMean > 0 ? parseFloat((nominal / rollingMean).toFixed(2)) : 1.0;

        return {
          hari_dalam_minggu: parseInt(row.hari_dalam_minggu),
          id_transaksi: String(row.id_transaksi),
          jam_encoded: parseInt(row.jam_encoded),
          kategori: row.kategori || 'Lain-lain',
          nominal: nominal,
          rasio_vs_baseline: rasioVsBaseline,
          rolling_mean_7d: parseFloat(rollingMean.toFixed(2))
        };
      });

      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';

        // 3. Tembak Server AI dengan body request sesuai dokumentasi
        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: transaksiFormatted
        });

        // Tangkap respon utama dari AI
        const dataMentahAI = responseDariAI.data.hasil || responseDariAI.data.anomali || responseDariAI.data;
        const arrayValidAI = Array.isArray(dataMentahAI) ? dataMentahAI : [];

        // 4. Mapping & Pemetaan Hasil berdasarkan Data Dictionary AI
        const transaksiTerklasifikasi = arrayValidAI.map((tx) => {
          
          // Cari data pendukung dari transaksiFormatted kita berdasarkan id_transaksi
          const dataAsli = transaksiFormatted.find(t => String(t.id_transaksi) === String(tx.id_transaksi));
          
          // SINKRONISASI LOGIKA ACUAN DOKUMENTASI TIM AI:
          // Kita pakai 'tx.is_anomaly' langsung (BOOLEAN) sesuai spesifikasi model Isolation Forest mereka!
          // Jika tx.is_anomaly tidak dikirim balik, baru kita gunakan fallback score (< -0.1)
          const isAnomaly = tx.is_anomaly !== undefined 
            ? tx.is_anomaly 
            : (tx.anomaly_score !== undefined ? tx.anomaly_score < -0.1 : false);

          // Ambil nilai rasio_vs_baseline dari AI, jika kosong ambil dari hitungan aman dataAsli kita
          const rasioFinal = tx.rasio_vs_baseline || (dataAsli ? dataAsli.rasio_vs_baseline : 1);

          return {
            id_transaksi: String(tx.id_transaksi),
            kategori: tx.kategori || (dataAsli ? dataAsli.kategori : 'Operasional'),
            nominal: parseFloat(tx.nominal) || (dataAsli ? dataAsli.nominal : 0),
            
            // Perbaikan persen: Mengubah angka rasio desimal menjadi string persentase dinamis yang valid
            baseline_rata_rata: `${(rasioFinal * 100).toFixed(1)}%`,
            
            // Klasifikasi tegas untuk UI Laptop Salamah
            status_audit: isAnomaly ? 'ANOMALI' : 'NORMAL',
            hasil_analisis: isAnomaly 
              ? 'Terdeteksi pengeluaran melonjak tidak wajar di luar batas baseline mingguan!' 
              : 'Transaksi aman dan tercatat sesuai batas wajar.'
          };
        });

        // 5. Lempar data matang, rapi, dan anti-error ke Frontend React
        return response(res, 200, 'Analisis anomali transaksi berhasil diproses oleh AI', {
          anomali: transaksiTerklasifikasi
        });
       
      } catch (errorAI) {
        console.error('Error dari AI Service:', errorAI.message);
        return res.status(502).json({
          status: 'fail',
          message: 'Gagal mendapatkan analisis dari server AI. Pastikan layanan cloud tim AI sudah aktif.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};