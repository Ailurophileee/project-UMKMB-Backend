import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getAIAdvisory = async (req, res, next) => {
  try {
    const idWarungSipemilik = req.user.id_warung; 

    // Ambil Data Historis Arus Kas 30 Hari Terakhir
    const queryKasStr = `
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

    db.query(queryKasStr, [idWarungSipemilik], async (errKas, resultsKas) => {
      if (errKas) return next(errKas);

      // Ekstrak hasil kueri menjadi array angka murni float, lalu balik urutannya (dari lampau ke terbaru)
      let data30Hari = resultsKas.map(row => parseFloat(row.net_cashflow) || 0.0).reverse();

      // Aturan Pengaman: Jika warung baru, penuhi sisa array dengan angka 0.0 agar model AI tidak crash
      while (data30Hari.length < 30) {
        data30Hari.unshift(0.0);
      }

      // Ambil Data Performa Produk untuk BCG Matrix
      const queryProdukStr = `
      SELECT 
        p.id_produk,
        p.nama_produk,
        p.harga_jual,
        p.harga_pokok,
        SUM(t.qty) AS qty_terjual
      FROM produk p
      INNER JOIN transaksi t ON p.id_produk = t.id_produk 
      WHERE p.id_warung = ? AND t.jenis = 'Pemasukan'
      GROUP BY p.id_produk, p.nama_produk, p.harga_jual, p.harga_pokok
      HAVING qty_terjual > 0
    `;

      db.query(queryProdukStr, [idWarungSipemilik], async (errProd, resultsProd) => {
        if (errProd) return next(errProd);

        // Format data produk agar pas dengan format JSON yang diminta tim DS
        const dataProdukFormatted = resultsProd.map(row => ({
          id_produk: String(row.id_produk),
          nama_produk: row.nama_produk,
          harga_jual: parseFloat(row.harga_jual) || 0,
          harga_pokok: parseFloat(row.harga_pokok) || 0,
          qty_terjual: parseInt(row.qty_terjual) || 0
        }));

        // Gabungkan Payload & Tembak ke Server AI Advisory Live
        try {
          const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/advisory';
          
          console.log(`[Advisory] Mengirim paket data gabungan untuk warung: ${idWarungSipemilik}`);
          
          const responseDariAI = await axios.post(urlServerAI, {
            data_30_hari: data30Hari,
            produk: dataProdukFormatted
          });

          // Ambil output murni dari model gabungan tim AI (prioritas, status_kas, prediksi_kas, rekomendasi)
          let aiAdvisoryResult = { ...responseDariAI.data }; 

          console.log("[Advisory] Berhasil mendapatkan rekomendasi dari Railway:", aiAdvisoryResult);

          // Kembalikan objek output yang bersih ke Front-End React
          return response(res, 200, 'Rekomendasi bisnis otomatis berhasil dirakit oleh Advisory Layer AI', aiAdvisoryResult);
          
        } catch (errorAI) {
          console.error('Koneksi ke server AI Advisory Railway bermasalah:', errorAI.message);
          return res.status(502).json({
            status: 'fail',
            message: 'Gagal mendapatkan analisis dari Advisory Layer AI Railway. Pastikan layanan di cloud sudah aktif.'
          });
        }
      });
    });

  } catch (error) {
    next(error);
  }
};