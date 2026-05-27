import mysql from 'mysql2';
import dotenv from 'dotenv';

// Aktifkan dotenv agar bisa membaca file .env
dotenv.config();

// Buat koneksi pool ke MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  // 💡 Buat ssl menjadi opsional atau hapus jika terjadi kendala koneksi internal
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Tes koneksi ke database saat server dinyalakan
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Koneksi database MySQL gagal:', err.message);
  } else {
    console.log('Database MySQL berhasil terhubung dengan aman!');
    connection.release(); // Kembalikan koneksi ke pool
  }
});

export default db;