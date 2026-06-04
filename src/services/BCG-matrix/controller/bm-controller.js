import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getBCGMatrix = async (req, res, next) => {
  try {
    // 1. Membaca ID warung milik user yang sedang login dari token JWT
    const idWarungSipemilik = req.user.id_warung; 

    // 2. Kueri SQL: Mengambil data performa produk dari database
    const queryStr = `
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

    db.query(queryStr, [idWarungSipemilik], async (err, results) => {
      if (err) {
        return next(err);
      }
      
      if (!results || results.length === 0) {
        return res.status(200).json({
          status: 'empty',
          message: 'Gagal melakukan analisis BCG Matrix karena Anda belum memiliki data produk.',
          produk: []
        });
      }

      // 3. Format ulang data dari DB sesuai dengan kontrak JSON yang diminta AI
      const formatProduk = results.map(row => ({
        id_produk: String(row.id_produk),
        nama_produk: row.nama_produk,
        harga_jual: parseFloat(row.harga_jual) || 0,
        harga_pokok: parseFloat(row.harga_pokok) || 0,
        qty_terjual: parseInt(row.qty_terjual) || 0
      }));

      try {
        // Tembak Endpoint POST AI dengan Query Parameter id_warung
        const urlServerAI = `https://umkm-bersama-production.up.railway.app/api/ai/bcg-matrix?id_warung=${idWarungSipemilik}`;
        
        const responseDariAI = await axios.post(urlServerAI, {
          produk: formatProduk
        });

        // Ambil data respon mentah dari AI (antisipasi berbentuk array langsung atau objek)
        let aiResultRaw = responseDariAI.data; 
        const aiProducts = Array.isArray(aiResultRaw) ? aiResultRaw : (aiResultRaw.produk || []);

        // Gabungkan analisa AI dengan data database
        const produkLengkapSiapKirim = aiProducts.map(aiItem => {
          const dataAsliDB = formatProduk.find(dbItem => dbItem.id_produk === aiItem.id_produk);

          return {
            id_produk: aiItem.id_produk,
            nama_produk: aiItem.nama_produk || dataAsliDB?.nama_produk,
            qty_terjual: aiItem.qty_terjual || dataAsliDB?.qty_terjual,
            kuadran: aiItem.kuadran || aiItem.status || 'Unknown',
            harga_jual: dataAsliDB ? dataAsliDB.harga_jual : 0, 
            harga_pokok: dataAsliDB ? dataAsliDB.harga_pokok : 0,
            
            // Pastikan nilai margin persen ditangkap untuk sumbu Y grafik
            margin_pct: parseFloat(aiItem.margin_pct) || 0, 
            rekomendasi: aiItem.rekomendasi || ''
          };
        });

        // Kirimkan data utuh terbungkus objek produk ke Frontend
        return response(res, 200, 'Analisis BCG Matrix berhasil', { 
          produk: produkLengkapSiapKirim,
          // Jika AI mengembalikan nilai median, sisipkan di sini
          median_qty: aiResultRaw.median_qty || null,
          median_margin: aiResultRaw.median_margin || null
        });        
      } catch (errorAI) {
        console.error('Koneksi ke server AI Railway bermasalah saat analisis BCG:', errorAI.message);
        
        if (errorAI.response && errorAI.response.status === 422) {
          return res.status(422).json({
            status: 'fail',
            message: 'Validasi data gagal pada server AI.',
            detail: errorAI.response.data.detail
          });
        }

        return res.status(502).json({
          status: 'fail',
          message: 'Gagal mendapatkan analisis BCG dari server AI Railway.'
        });
      }
    });

  } catch (error) {
    next(error);
  }
};