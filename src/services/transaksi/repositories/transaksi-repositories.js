// src/services/transaksi/repositories/transaksi-repositories.js
import db from '../../../config/db.js';
import { customAlphabet } from 'nanoid';

class TransaksiRepository {
  
  // 1. MENAMBAH TRANSAKSI BARU (PEMASUKAN / PENGELUARAN)
  async createTransaksi(payload) {
    return new Promise((resolve, reject) => {
      const { id_warung, id_produk, jam_transaksi, jenis, kategori, nominal, qty, metode_bayar, catatan } = payload;
      
      const alfabetHex = '0123456789ABCDEF-';
      const generateHexId = customAlphabet(alfabetHex, 12);
      const id_transaksi = generateHexId();
      const tanggal = new Date().toISOString().split('T')[0];
      const query = `
        INSERT INTO transaksi (
          id_transaksi, id_warung, id_produk, tanggal, jam_transaksi, 
          jenis, kategori, nominal, qty, metode_bayar, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Menangani konversi nilai kosong menjadi NULL di MySQL agar anak DS tidak pusing membaca data kosong
      const sqlParams = [
        id_transaksi,
        id_warung,
        id_produk || null, 
        tanggal,
        jam_transaksi,
        jenis,
        kategori,
        nominal,
        qty !== undefined ? qty : null,
        metode_bayar,
        catatan || null
      ];

      db.query(query, sqlParams, (err, result) => {
        if (err) {
          console.error('❌ Error MySQL saat createTransaksi:', err.message);
          return reject(err);
        }
        resolve({ 
          id_transaksi, 
          tanggal, 
          jam_transaksi,
          affectedRows: result.affectedRows 
        });
      });
    });
  }

  // 2. AMBIL SEMUA TRANSAKSI PER WARUNG (Untuk grafik historis dashboard & forecasting DS)
  async findAllTransaksiByWarung(id_warung) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM transaksi WHERE id_warung = ? ORDER BY tanggal DESC, jam_transaksi DESC';
      
      db.query(query, [id_warung], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  // src/services/transaksi/repositories/transaksi-repositories.js

async getTransaksiSummary(id_warung) {
  return new Promise((resolve, reject) => {
    
    const queryWarung = `SELECT pemilik FROM warung WHERE id_warung = ?`;

    const queryKalkulasi = `
      SELECT 
        SUM(CASE WHEN jenis = 'Pemasukan' THEN nominal ELSE 0 END) as total_pemasukan,
        SUM(CASE WHEN jenis = 'Pengeluaran' THEN nominal ELSE 0 END) as total_pengeluaran
      FROM transaksi 
      WHERE id_warung = ?
    `;

    const queryProdukTerlaris = `
      SELECT t.id_produk, p.nama_produk, SUM(t.qty) as total_qty
      FROM transaksi t
      JOIN produk p ON t.id_produk = p.id_produk
      WHERE t.id_warung = ? AND t.jenis = 'Pemasukan' AND t.id_produk IS NOT NULL
      GROUP BY t.id_produk, p.nama_produk
      ORDER BY total_qty DESC
      LIMIT 1
    `;

    const queryPengeluaranTerbesar = `
      SELECT kategori, SUM(nominal) as total_nominal
      FROM transaksi
      WHERE id_warung = ? AND jenis = 'Pengeluaran'
      GROUP BY kategori
      ORDER BY total_nominal DESC
      LIMIT 1
    `;

    db.query(queryWarung, [id_warung], (err, resWarung) => {
      if (err) return reject(err);
      
      db.query(queryKalkulasi, [id_warung], (err, resKalkulasi) => {
        if (err) return reject(err);

        db.query(queryProdukTerlaris, [id_warung], (err, resProduk) => {
          if (err) return reject(err);

          db.query(queryPengeluaranTerbesar, [id_warung], (err, resPengeluaran) => {
            if (err) return reject(err);

            const infoWarung = resWarung[0] || { pemilik: 'Owner' };
            const kalkulasi = resKalkulasi[0] || { total_pemasukan: 0, total_pengeluaran: 0 };
            const produkTerlaris = resProduk[0] || { nama_produk: 'Belum ada data', total_qty: 0 };
            const pengeluaranTerbesar = resPengeluaran[0] || { kategori: 'Belum ada data', total_nominal: 0 };

            const pemasukan = parseInt(kalkulasi.total_pemasukan) || 0;
            const pengeluaran = parseInt(kalkulasi.total_pengeluaran) || 0;

            resolve({
              nama_pemilik: infoWarung.pemilik,
              total_pemasukan: pemasukan,
              total_pengeluaran: pengeluaran,
              laba_bersih: pemasukan - pengeluaran,
              saldo: pemasukan - pengeluaran,
              produk_terlaris: produkTerlaris.nama_produk,
              pengeluaran_terbesar: pengeluaranTerbesar.kategori
            });
          });
        });
      });
    });
  });
}


async updateTransaksi(id_transaksi, id_warung, data) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE transaksi 
      SET jenis = ?, tanggal = ?, jam_transaksi = ?, kategori = ?, id_produk = ?, qty = ?, nominal = ?, metode_bayar = ?, catatan = ?
      WHERE id_transaksi = ? AND id_warung = ?
    `;
    
    const values = [
      data.jenis, data.tanggal, data.jam_transaksi, data.kategori,
      data.id_produk, data.qty, data.nominal, data.metode_bayar, data.catatan,
      id_transaksi, id_warung
    ];

    db.query(query, values, (err, res) => {
      if (err) return reject(err);
      resolve(res.affectedRows); // Mengembalikan jumlah baris yang berhasil diubah
    });
  });
}

async deleteTransaksi(id_transaksi, id_warung) {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM transaksi WHERE id_transaksi = ? AND id_warung = ?`;

    db.query(query, [id_transaksi, id_warung], (err, res) => {
      if (err) return reject(err);
      resolve(res.affectedRows); // Mengembalikan jumlah baris yang berhasil dihapus
    });
  });
}
}

export default new TransaksiRepository();