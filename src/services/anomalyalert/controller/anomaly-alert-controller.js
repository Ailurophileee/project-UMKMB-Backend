import axios from 'axios';
import db from '../../../config/db.js';
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    const idWarungSipemilik = req.user.id_warung;

    // Ambil transaksi Pengeluaran 30 hari terakhir
    // Sekaligus hitung rolling_mean_7d per kategori via self-join
    const queryAnomalyStr = `
      SELECT
        t1.id_transaksi,
        t1.kategori,
        t1.nominal,
        (DAYOFWEEK(t1.tanggal) + 5) % 7        AS hari_dalam_minggu,
        COALESCE(HOUR(t1.jam_transaksi), 0)     AS jam_encoded,
        COALESCE(AVG(t2.nominal), t1.nominal)   AS rolling_mean_7d
      FROM transaksi t1
      LEFT JOIN transaksi t2
        ON  t2.id_warung  = t1.id_warung
        AND t2.kategori   = t1.kategori
        AND t2.jenis      = 'Pengeluaran'
        AND t2.tanggal BETWEEN DATE_SUB(t1.tanggal, INTERVAL 6 DAY) AND t1.tanggal
      WHERE
        t1.id_warung = ?
        AND t1.jenis = 'Pengeluaran'
        AND t1.tanggal >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY
        t1.id_transaksi,
        t1.tanggal,
        t1.jam_transaksi,
        t1.kategori,
        t1.nominal
      ORDER BY t1.tanggal DESC, t1.jam_transaksi DESC
    `;

    db.query(queryAnomalyStr, [idWarungSipemilik], async (errQuery, resultsQuery) => {
      if (errQuery) return next(errQuery);

      // Jika belum ada transaksi pengeluaran, kembalikan hasil kosong (jangan crash)
      if (!resultsQuery || resultsQuery.length === 0) {
        return response(res, 200, 'Tidak ada transaksi pengeluaran untuk dianalisis', {
          anomalies: [],
          pesan_peringatan: []
        });
      }

      // Format payload sesuai spesifikasi API AI Anomaly Detection
      const transaksiFormatted = resultsQuery.map(row => {
        const nominal      = parseInt(row.nominal)        || 0;
        const rollingMean  = parseFloat(row.rolling_mean_7d) || 1; // hindari pembagian nol

        // rasio_vs_baseline = seberapa besar transaksi ini dibanding rata-rata 7 hari
        const rasioVsBaseline = parseFloat((nominal / rollingMean).toFixed(2));

        return {
          id_transaksi      : String(row.id_transaksi),
          hari_dalam_minggu : parseInt(row.hari_dalam_minggu),  // 0=Senin … 6=Minggu
          jam_encoded       : parseInt(row.jam_encoded),        // 0-23
          kategori          : row.kategori,
          nominal           : nominal,
          rasio_vs_baseline : rasioVsBaseline,
          rolling_mean_7d   : parseFloat(rollingMean.toFixed(2))
        };
      });

      // Kirim ke server AI Anomaly Detection
      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';

        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: transaksiFormatted
        });

        const anomalyResult = { ...responseDariAI.data };

        return response(
          res,
          200,
          'Deteksi anomali transaksi pengeluaran berhasil',
          anomalyResult
        );

      } catch (errorAI) {
        console.error('Koneksi ke server AI Anomaly Railway bermasalah:', errorAI.message);
        return res.status(502).json({
          status  : 'fail',
          message : 'Gagal mendapatkan analisis dari Anomaly Detection AI Railway. Pastikan layanan di cloud sudah aktif.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};