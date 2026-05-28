const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2');

// 1. Hubungkan ke MySQL Railway
const connection = mysql.createConnection({
  host: 'zephyr.proxy.rlwy.net',
  user: 'root',
  password: 'FcMnbwPrFFjJjTBNfxONUznkDWVhPMpI',
  database: 'railway',
  port: 14497
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Gagal konek ke MySQL Railway:', err);
    return;
  }
  console.log('🚀 Koneksi Sukses! Memulai proses import massal...\n');
  
  // Eksekusi fungsi import untuk masing-masing file
  importWarung();
});

// ==========================================
// 1. IMPORT DATA WARUNG
// ==========================================
function importWarung() {
  console.log('⏳ Memproses file warung_bersih.csv...');
  fs.createReadStream('warung_bersih.csv')
    .pipe(csv({ headers: false }))
    .on('data', (row) => {
      // row[0]=id_warung, row[1]=nama_warung, row[2]=pemilik, row[3]=kota, row[4]=kecamatan, row[5]=tanggal_daftar, row[6]=status
      const query = `INSERT INTO stores (id, name, owner, city, district, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const values = [row[0], row[1], row[2], row[3], row[4], row[5], row[6]];

      connection.query(query, values, (err) => {
        if (err) console.error(`   ❌ Gagal warung [${row[1]}]:`, err.message);
      });
    })
    .on('end', () => {
      console.log('✅ Selesai mengimport Warung!\n');
      // Lanjut ke import produk setelah warung selesai
      importProduk();
    });
}

// ==========================================
// 2. IMPORT DATA PRODUK
// ==========================================
function importProduk() {
  console.log('⏳ Memproses file produk_bersih.csv...');
  fs.createReadStream('produk_bersih.csv')
    .pipe(csv({ headers: false }))
    .on('data', (row) => {
      // row[0]=id_produk, row[1]=id_warung, row[2]=nama_produk, row[3]=harga_jual, row[4]=harga_pokok, row[5]=kategori_produk, row[6]=status
      const query = `INSERT INTO products (id, store_id, name, price, cost, category, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const values = [row[0], row[1], row[2], row[3], row[4], row[5], row[6]];

      connection.query(query, values, (err) => {
        if (err) console.error(`   ❌ Gagal produk [${row[2]}]:`, err.message);
      });
    })
    .on('end', () => {
      console.log('✅ Selesai mengimport Produk!\n');
      // Lanjut ke import transaksi paling akhir
      importTransaksi();
    });
}

// ==========================================
// 3. IMPORT DATA TRANSAKSI
// ==========================================
function importTransaksi() {
  console.log('⏳ Memproses file transaksi_bersih.csv (Ini agak berat, mohon tunggu)...');
  fs.createReadStream('transaksi_bersih.csv')
    .pipe(csv({ headers: false }))
    .on('data', (row) => {
      // row[0]=id_transaksi, row[1]=id_warung, row[2]=id_produk, row[3]=tanggal, row[4]=jam_transaksi
      // row[5]=jenis, row[6]=kategori, row[7]=nominal, row[8]=qty, row[9]=metode_bayar, row[10]=catatan
      const query = `
        INSERT INTO transactions 
        (id, store_id, product_id, date, time, type, category, amount, qty, payment_method, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10]];

      connection.query(query, values, (err) => {
        if (err) console.error(`   ❌ Gagal transaksi [ID: ${row[0]}]:`, err.message);
      });
    })
    .on('end', () => {
      console.log('✅ Selesai mengimport Semua Transaksi!');
      console.log('=== SEMUA PROSES BERHASIL DISELESAIKAN ===');
    });
}