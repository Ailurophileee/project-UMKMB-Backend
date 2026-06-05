import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    // 1. Ambil ID warung dari token JWT user yang login
    const idWarungSipemilik = req.user.id_warung; 

    // Query SQL untuk mengambil data pengeluaran beserta rolling mean 7 transaksi terakhir per kategori
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

      // Jika data pengeluaran belum ada
      if (!results || results.length === 0) {
        return response(res, 200, 'Belum ada data transaksi pengeluaran untuk dianalisis.', { anomali: [] });
      }
      
      // 2. Format data input agar MATCH 100% dengan Data Dictionary & JSON Request tim AI
      const transaksiFormatted = results.map(row => {
        const nominal = parseFloat(row.nominal) || 0;
        const rollingMean = parseFloat(row.rolling_mean_7d) || nominal; 
        
        // Kalkulasi rasio_vs_baseline sesuai standarisasi data dictionary
        const rasioVsBaseline = rollingMean > 0 ? parseFloat((nominal / rollingMean).toFixed(2)) : 1.0;

        return {
          hari_dalam_minggu: parseInt(row.hari_dalam_minggu), // 0=Senin, 6=Minggu
          id_transaksi: String(row.id_transaksi),
          jam_encoded: parseInt(row.jam_encoded),            // 0-23
          kategori: row.kategori || 'Lain-lain',
          nominal: nominal,
          rasio_vs_baseline: rasioVsBaseline,
          rolling_mean_7d: parseFloat(rollingMean.toFixed(2))
        };
      });

      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';

        // 3. Tembak Server AI dengan body request terstandardisasi
        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: transaksiFormatted
        });

        // 4. Ambil array 'is_anomaly' mentah dari response FastAPI tim DS ([1, 1, -1, ...])
        const listIsAnomaly = responseDariAI.data.is_anomaly || [];

        // 5. Petakan hasil analisis menggunakan INDEX urutan data agar rekat kembali dengan data transaksi asli
        const transaksiTerklasifikasi = transaksiFormatted.map((dataAsli, index) => {
          
          // Di Python Isolation Forest tim DS: -1 berarti ANOMALI, dan 1 berarti NORMAL
          const nilaiIsAnomaly = listIsAnomaly[index];
          const isAnomaly = nilaiIsAnomaly === -1 || String(nilaiIsAnomaly) === '-1';

          return {
            id_transaksi: dataAsli.id_transaksi,
            kategori: dataAsli.kategori,
            nominal: dataAsli.nominal,
            // Format tampilan desimal persen untuk baseline_rata_rata di UI Frontend
            baseline_rata_rata: `${(dataAsli.rasio_vs_baseline * 100).toFixed(1)}%`,
            
            // Output status tegas untuk dibaca oleh filter komponen React Frontend
            status_audit: isAnomaly ? 'ANOMALI' : 'NORMAL',
            hasil_analisis: isAnomaly 
              ? '⚠️ Terdeteksi pengeluaran melonjak tajam dari batas wajar harian!' 
              : 'Transaksi aman dan tercatat sesuai batas wajar.'
          };
        });
        console.log('test');

        // 6. Kembalikan data matang berstruktur objek properti { anomali: [...] } ke Frontend
        return response(res, 200, 'Analisis anomali transaksi berhasil diproses oleh AI', {
          anomali: transaksiTerklasifikasi
        });
       
      } catch (errorAI) {
        console.error('Error dari AI Anomaly Service:', errorAI.message);
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