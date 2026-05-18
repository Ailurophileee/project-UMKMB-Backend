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
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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