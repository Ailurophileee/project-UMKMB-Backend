import axios from 'axios';
import db from '../../../config/db.js';
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    const idWarungSipemilik = req.user.id_warung;
    const queryAnomalyStr = `
      SELECT
        id_transaksi,
        kategori,
        nominal,
        tanggal,
        (DAYOFWEEK(tanggal) + 5) % 7          AS hari_dalam_minggu,
        COALESCE(HOUR(jam_transaksi), 0)       AS jam_encoded
      FROM transaksi
      WHERE
        id_warung = ?
        AND jenis = 'Pengeluaran'
        AND nominal > 0
        AND jam_transaksi IS NOT NULL
      ORDER BY kategori ASC, tanggal ASC, jam_transaksi ASC
    `;

    db.query(queryAnomalyStr, [idWarungSipemilik], async (errQuery, resultsQuery) => {
      if (errQuery) return next(errQuery);

      if (!resultsQuery || resultsQuery.length === 0) {
        return response(res, 200, 'Tidak ada transaksi pengeluaran untuk dianalisis', {
          anomali: [],
          pesan_peringatan: []
        });
      }

      const nominalPerKategori = {};

      const transaksiWithRolling = resultsQuery.map(row => {
        const kat     = row.kategori;
        const nominal = parseFloat(row.nominal) || 0;

        if (!nominalPerKategori[kat]) nominalPerKategori[kat] = [];

        const history = nominalPerKategori[kat];
        history.push(nominal);
        const window     = history.slice(-7);
        const rollingMean = window.reduce((sum, v) => sum + v, 0) / window.length;

        const rasioVsBaseline = rollingMean > 0
          ? parseFloat((nominal / rollingMean).toFixed(2))
          : 1.0;

        return {
          id_transaksi      : String(row.id_transaksi),
          tanggal           : row.tanggal,
          hari_dalam_minggu : parseInt(row.hari_dalam_minggu),
          jam_encoded       : parseInt(row.jam_encoded),
          kategori          : kat,
          nominal           : nominal,
          rasio_vs_baseline : rasioVsBaseline,
          rolling_mean_7d   : parseFloat(rollingMean.toFixed(4)),
        };
      });
      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';
        const mapDB = {};
        for (const t of transaksiWithRolling) {
          mapDB[t.id_transaksi] = t;
        }

        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: transaksiWithRolling
        });

        const rawAI = responseDariAI.data;

        // AI memproses PER KATEGORI (HPP dulu, Operasional, Overhead)
        const listMentah = rawAI.hasil || rawAI.results || rawAI.detections
          || rawAI.transaksi || rawAI.anomali || rawAI.data || [];

        // Buat map id_transaksi -> hasil AI
        const mapAI = {};
        for (const item of listMentah) {
          if (item.id_transaksi) {
            mapAI[item.id_transaksi] = item;
          }
        }

        const listNormalized = transaksiWithRolling
          .slice()
          .reverse() // balik ke DESC setelah rolling selesai dihitung
          .map(dataDB => {
            const itemAI = mapAI[dataDB.id_transaksi] || {};

            // Deteksi status anomali dari berbagai kemungkinan field response AI
            // Notebook DS: is_anomaly = 1 berarti anomali (predictions == -1 dikonversi ke int)
            let statusAudit = 'NORMAL';
            if (itemAI.status_audit) {
              statusAudit = String(itemAI.status_audit).toUpperCase();
            } else if (
              itemAI.is_anomaly === 1  ||
              itemAI.is_anomaly === -1 ||
              String(itemAI.is_anomaly) === '-1' ||
              itemAI.is_anomaly === true ||
              String(itemAI.label).toLowerCase() === 'anomaly' ||
              String(itemAI.label).toLowerCase() === 'anomali'
            ) {
              statusAudit = 'ANOMALI';
            }

            const pesanAnalisis =
              itemAI.pesan_anomali || itemAI.pesan || itemAI.message ||
              (statusAudit === 'ANOMALI'
                ? `⚠️ Pengeluaran ${dataDB.kategori} sebesar Rp ${dataDB.nominal.toLocaleString('id-ID')} terdeteksi tidak wajar. Rata-rata 7 transaksi terakhir: Rp ${dataDB.rolling_mean_7d.toLocaleString('id-ID')}.`
                : `Pengeluaran ${dataDB.kategori} aman dan tercatat sesuai batas wajar.`);

            return {
              id_transaksi      : dataDB.id_transaksi,
              tanggal           : dataDB.tanggal,
              kategori          : dataDB.kategori,
              nominal           : dataDB.nominal,
              rasio_vs_baseline : dataDB.rasio_vs_baseline,
              rolling_mean_7d   : dataDB.rolling_mean_7d,
              anomaly_score     : itemAI.anomaly_score ?? null,
              status_audit      : statusAudit,
              pesan             : pesanAnalisis,
            };
          });

        const anomalyResult = {
          anomali          : listNormalized,
          pesan_peringatan : rawAI.pesan_peringatan || rawAI.warnings || [],
          total_transaksi  : listNormalized.length,
          total_anomali    : listNormalized.filter(t => t.status_audit === 'ANOMALI').length,
        };

        return response(res, 200, 'Deteksi anomali transaksi pengeluaran berhasil', anomalyResult);

      } catch (errorAI) {
        console.error('Koneksi ke server AI Anomaly Railway bermasalah:', errorAI.message);
        return res.status(502).json({
          status  : 'fail',
          message : 'Gagal mendapatkan analisis dari Anomaly Detection AI Railway.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};