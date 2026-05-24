import axios from 'axios'; 
import db from '../../../config/db.js';
import response from '../../../utils/response.js';

export const getCashflowForecast = async (req, res, next) => {
  try {
    // Membaca ID warung milik user yang sedang login dari muatan token JWT
    const idWarungSipemilik = req.user.id_warung; 

    // Kueri SQL: Mengambil arus kas bersih (Pemasukan - Pengeluaran) harian selama 30 hari terakhir
    const queryStr = `
      SELECT 
        tanggal,
        SUM(CASE WHEN jenis = 'Pemasukan' THEN nominal ELSE 0 END) - 
        SUM(CASE WHEN jenis = 'Pengeluaran' THEN nominal ELSE 0 END) AS net_cashflow
      FROM transaksi
      WHERE id_warung = ?
      GROUP BY tanggal
      ORDER BY tanggal DESC
      LIMIT 30
    `;

    db.query(queryStr, [idWarungSipemilik], async (err, results) => {
      if (err) {
        return next(err);
      }
      console.log("Warung yang sedang di-query:", idWarungSipemilik);
      console.log("Hasil grouping per tanggal:", results);

      // Ekstrak hasil kueri menjadi array angka murni float, lalu balik urutannya (dari lampau ke terbaru)
      let data30Hari = results.map(row => parseFloat(row.net_cashflow) || 0.0).reverse();

      // Aturan Pengaman: Jika warung baru berdiri dan belum punya 30 hari transaksi, 
      //  penuhi sisa array dengan angka 0.0 agar model LSTM tim AI tidak eror/crash.
      while (data30Hari.length < 30) {
        data30Hari.unshift(0.0);
      }

      try {
        const urlServerAI = 'http://127.0.0.1:8000/api/ai/cashflow-forecast';
        
        console.log("Jumlah data dikirim:", data30Hari.length);
        const responseDariAI = await axios.post(urlServerAI, {
          data_30_hari: data30Hari
        });

        // --- MULAI LOGIKA BUFFER ZONE ---
        let aiResult = { ...responseDariAI.data }; // Salin data agar tidak merusak respons asli
        const prediksi = aiResult.prediksi_cashflow_besok;

        // Logika Status Kustom (Business Logic)
        if (prediksi >= 0) {
          aiResult.status = "positif";
        } else if (prediksi >= -50000) {
          // Jika rugi kecil (0 s/d -50rb), ubah jadi status 'waspada'
          aiResult.status = "waspada";
          aiResult.peringatan = "Arus kas tipis! Perhatikan pengeluaran hari ini agar tidak defisit.";
        } else {
          // Jika rugi besar (<-50rb), tetap 'negatif'
          aiResult.status = "negatif";
        }
        // --- SELESAI LOGIKA BUFFER ZONE ---

        aiResult.historis_30_hari = data30Hari;

        return response(res, 200, 'Prediksi cashflow berhasil digenerate oleh AI', aiResult);
      } catch (errorAI) {
        console.error('Koneksi ke server AI Python terputus:', errorAI.message);
        return res.status(502).json({
          status: 'fail',
          message: 'Gagal terhubung dengan server analisis AI. Pastikan server Python tim AI sudah dinyalakan.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};