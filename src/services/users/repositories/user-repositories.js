import bcrypt from 'bcrypt'; 
import db from '../../../config/db.js';
class UserRepositories {
  
  // 1. MEMBUAT USER BARU (REGISTER)
  async createUser({ username, password, id_warung }) {
    return new Promise(async (resolve, reject) => {
      try {
        // Enkripsi password menggunakan bcrypt agar aman di database
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Query INSERT standar MySQL (id_user akan AUTO_INCREMENT otomatis dari database)
        const query = 'INSERT INTO users (username, password, id_warung) VALUES (?, ?, ?)';
        
        db.query(query, [username, hashedPassword, id_warung], (err, result) => {
          if (err) {
            console.error('❌ Error MySQL saat createUser:', err.message);
            return reject(err);
          }
          
          // Mengembalikan id_user yang baru saja diciptakan secara otomatis oleh MySQL
          resolve({ id_user: result.insertId, username });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 2. MENGECEK APAKAH USERNAME SUDAH TERPAKAI ATAU BELUM
  async verifyNewUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT username FROM users WHERE username = ?';
      
      db.query(query, [username], (err, results) => {
        if (err) return reject(err);
        
        // Menghasilkan true jika username sudah terdaftar, false jika belum
        resolve(results.length > 0);
      });
    });
  }

  // 3. AMBIL DATA USER BERDASARKAN ID
  async getUserById(id_user) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id_user, username, id_warung FROM users WHERE id_user = ?';
      
      db.query(query, [id_user], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]); // Mengembalikan data objek user tunggal
      });
    });
  }

  // 4. VERIFIKASI KREDENSIAL SAAT LOGIN (COCOKKAN USERNAME & PASSWORD)
  async verifyUserCredential(username, password) {    
    return new Promise((resolve, reject) => {
      // Cari password_hash dan id_warung milik username tersebut
      const query = 'SELECT id_user, password, id_warung FROM users WHERE username = ?';
      
      db.query(query, [username], async (err, results) => {
        if (err) return reject(err);
        
        // Jika username tidak ditemukan di database
        if (results.length === 0) {
          return resolve(null);
        }
        
        const { id_user, password: hashedPassword, id_warung } = results[0];
        
        // Gunakan bcrypt untuk membandingkan password ketikan dengan password terenkripsi di DB
        const isPasswordMatch = await bcrypt.compare(password, hashedPassword);
        
        if (!isPasswordMatch) {
          return resolve(null); // Password salah
        }
        
        // Jika sukses cocok, kembalikan data penting user untuk modal membuat token JWT nanti
        return resolve({ id_user, username, id_warung });
      });
    });
  }
}

export default new UserRepositories();