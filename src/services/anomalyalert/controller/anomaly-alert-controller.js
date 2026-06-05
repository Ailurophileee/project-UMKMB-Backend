import axios from 'axios';
import db from '../../../config/db.js';
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    const idWarungSipemilik = req.user.id_warung;

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

      if (!resultsQuery || resultsQuery.length === 0) {
        return response(res, 200, 'Tidak ada transaksi pengeluaran untuk dianalisis', {
          anomali: [],
          pesan_peringatan: []
        });
      }

      const transaksiFormatted = resultsQuery.map(row => {
        const nominal     = parseInt(row.nominal)           || 0;
        const rollingMean = parseFloat(row.rolling_mean_7d) || 1;
        const rasioVsBaseline = parseFloat((nominal / rollingMean).toFixed(2));
        return {
          id_transaksi      : String(row.id_transaksi),
          hari_dalam_minggu : parseInt(row.hari_dalam_minggu),
          jam_encoded       : parseInt(row.jam_encoded),
          kategori          : row.kategori,
          nominal           : nominal,
          rasio_vs_baseline : rasioVsBaseline,
          rolling_mean_7d   : parseFloat(rollingMean.toFixed(2))
        };
      });

      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';
        const responseDariAI = await axios.post(urlServerAI, { transaksi: transaksiFormatted });

        const rawAI = responseDariAI.data;

        // Ambil list transaksi — AI mengembalikan key 'hasil' (sudah dikonfirmasi dari log)
        const listMentah = rawAI.hasil || rawAI.results || rawAI.detections || rawAI.transaksi || rawAI.anomali || rawAI.data || [];

        const listNormalized = listMentah.map(item => {
          // Merge dengan data DB agar nominal, rasio, rolling_mean tetap tersedia
          const dataDB = transaksiFormatted.find(t => t.id_transaksi === item.id_transaksi) || {};

          // PENTING: AI mengembalikan is_anomaly sebagai INTEGER (0 atau 1), bukan boolean
          // Gunakan Number() agar aman untuk semua kemungkinan tipe
          let statusAudit = 'NORMAL';
          if (item.status_audit) {
            statusAudit = String(item.status_audit).toUpperCase();
          } else if (Number(item.is_anomaly) === 1 || Number(item.anomaly) === 1) {
            statusAudit = 'ANOMALI';
          } else if (item.label === 'anomaly' || item.label === 'anomali') {
            statusAudit = 'ANOMALI';
          }

          return {
            id_transaksi      : item.id_transaksi      || dataDB.id_transaksi,
            kategori          : item.kategori          || dataDB.kategori,
            nominal           : item.nominal           || dataDB.nominal           || 0,
            rasio_vs_baseline : item.rasio_vs_baseline || dataDB.rasio_vs_baseline || 1,
            rolling_mean_7d   : item.rolling_mean_7d   || dataDB.rolling_mean_7d   || 0,
            anomaly_score     : item.anomaly_score     || null,
            status_audit      : statusAudit,
            // AI memakai field 'pesan_anomali' (sudah dikonfirmasi dari log)
            pesan             : item.pesan_anomali || item.pesan || item.message || item.warning || null,
          };
        });

        const anomalyResult = {
          anomali          : listNormalized,
          pesan_peringatan : rawAI.pesan_peringatan || rawAI.warnings || [],
          total_transaksi  : listNormalized.length,
          total_anomali    : listNormalized.filter(t => t.status_audit === 'ANOMALI').length,
        };

        return response(res, 200, 'Deteksi anomali pengeluaran berhasil', anomalyResult);

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