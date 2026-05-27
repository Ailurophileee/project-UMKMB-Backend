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
      // kita penuhi sisa array dengan angka 0.0 agar model LSTM tidak eror/crash.
      while (data30Hari.length < 30) {
        data30Hari.unshift(0.0);
      }

      try {
        // 🔥 KUNCI PERBAIKAN 1: Mengubah URL endpoint ke server AI Production yang live di Railway
        // Sesuaikan sub-path endpoint-nya (misal: /api/ai/cashflow-forecast) dengan route asli di FastAPI Railway kalian jika berbeda
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/cashflow-forecast';
        
        console.log("Mengirim data 30 hari ke Railway untuk warung:", idWarungSipemilik);
        
        const responseDariAI = await axios.post(urlServerAI, {
          data_30_hari: data30Hari
        });

        // 🔥 KUNCI PERBAIKAN 2: Mengambil respons mentah langsung dari AI Railway
        // Karena AI sekarang mengembalikan properti: prediksi_cashflow_besok, status, peringatan, dan satuan
        let aiResult = { ...responseDariAI.data }; 

        // Jalur pengaman tambahan jika string status dari AI menggunakan huruf kapital (misal: "Positif" -> "positif")
        if (aiResult.status) {
          aiResult.status = aiResult.status.toLowerCase();
        }

        // 🔥 KUNCI PERBAIKAN 3: Menyisipkan data riil historis agar ditangkap oleh Chart.js di FE
        aiResult.historis_30_hari = data30Hari;

        console.log("Hasil prediksi sukses dari Railway:", aiResult);

        // Kembalikan objek output yang bersih ke Front-End React
        return response(res, 200, 'Prediksi cashflow berhasil digenerate oleh AI di Railway', aiResult);
        
      } catch (errorAI) {
        console.error('Koneksi ke server AI Railway bermasalah:', errorAI.message);
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