import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    const idWarungSipemilik = req.user.id_warung; 

    // Query untuk mengambil transaksi pengeluaran hari ini / terbaru
    // Sekaligus menghitung rolling_mean_7d (rata-rata 7 hari ke belakang per kategori transaksi tersebut)
    const queryAnomalyStr = `
      SELECT 
        t1.id_transaksi,
        t1.tanggal,
        t1.kategori,
        t1.nominal,
        -- Mengambil jam dari tanggal/waktu transaksi
        HOUR(t1.tanggal) AS jam_encoded,
        -- Mengambil day of week standar Python (0=Senin, 6=Minggu)
        -- Di MySQL, WEEKDAY() secara default mengembalikan 0=Senin s/d 6=Minggu
        WEEKDAY(t1.tanggal) AS hari_dalam_minggu,
        -- Subquery untuk menghitung rolling mean 7 hari ke belakang (berdasarkan tanggal transaksi terkait)
        (
          SELECT COALESCE(AVG(t2.nominal), 0)
          FROM transaksi t2
          WHERE t2.id_warung = t1.id_warung
            AND t2.jenis = 'Pengeluaran'
            AND t2.kategori = t1.kategori
            AND t2.tanggal BETWEEN DATE_SUB(t1.tanggal, INTERVAL 7 DAY) AND t1.tanggal
        ) AS rolling_mean_7d
      FROM transaksi t1
      WHERE t1.id_warung = ? AND t1.jenis = 'Pengeluaran'
      ORDER BY t1.tanggal DESC
      LIMIT 10 -- Kamu bisa sesuaikan limitnya (misal: 10 transaksi pengeluaran terakhir)
    `;

    db.query(queryAnomalyStr, [idWarungSipemilik], async (errAnomaly, resultsAnomaly) => {
      if (errAnomaly) return next(errAnomaly);

      if (resultsAnomaly.length === 0) {
        return response(res, 200, 'Belum ada data pengeluaran untuk dideteksi', { transaksi: [] });
      }

      // Format data transaksi agar pas dengan format JSON yang diminta tim DS
      const dataTransaksiFormatted = resultsAnomaly.map(row => {
        const nominal = parseFloat(row.nominal) || 0;
        const rollingMean7d = parseFloat(row.rolling_mean_7d) || 0;
        
        // Hitung rasio_vs_baseline secara dinamis (nominal / rolling_mean_7d)
        // Amankan dengan fallback jika rolling mean bernilai 0
        const rasioVsBaseline = rollingMean7d > 0 
          ? parseFloat((nominal / rollingMean7d).toFixed(2)) 
          : 1.0;

        return {
          hari_dalam_minggu: parseInt(row.hari_dalam_minggu),
          id_transaksi: String(row.id_transaksi),
          jam_encoded: parseInt(row.jam_encoded),
          kategori: row.kategori, // Langsung ambil string dari kolom kategori
          nominal: nominal,
          rasio_vs_baseline: rasioVsBaseline,
          rolling_mean_7d: rollingMean7d
        };
      });

      // Tembak ke Server AI Anomaly Detection Live
      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';
                    
        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: dataTransaksiFormatted
        });

        // SEKARANG: Ambil array transaksi dari DS, bungkus ke properti 'anomali'
        const hasilModelDS = responseDariAI.data.transaksi || responseDariAI.data;

        let aiAnomalyResult = {
          anomali: Array.isArray(hasilModelDS) ? hasilModelDS : []
        }; 

        return response(res, 200, 'Deteksi anomali pengeluaran berhasil dianalisis oleh AI', aiAnomalyResult);

      } catch (errorAI) {
        console.error('Koneksi ke server AI Anomaly Railway bermasalah:', errorAI.message);
        return res.status(502).json({
          status: 'fail',
          message: 'Gagal mendapatkan analisis deteksi anomali dari AI Railway. Pastikan layanan di cloud sudah aktif.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};