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
      

      try {
        // Sesuaikan sub-path endpoint-nya (misal: /api/ai/cashflow-forecast) dengan route asli di FastAPI Railway kalian jika berbeda
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/cashflow-forecast';
        
        console.log("Mengirim data 30 hari ke Railway untuk warung:", idWarungSipemilik);
        
        const responseDariAI = await axios.post(urlServerAI, {
          data_30_hari: data30Hari
        });

        //  AI  mengembalikan properti: prediksi_cashflow_besok, status, peringatan, dan satuan
        let aiResult = { ...responseDariAI.data }; 

        if (aiResult.status) {
          aiResult.status = aiResult.status.toLowerCase();
        }

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