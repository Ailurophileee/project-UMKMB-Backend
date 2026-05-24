import bcrypt from 'bcrypt'; 
import db from '../../../config/db.js';

class UserRepositories {
  
  // 1. MEMBUAT USER BARU (REGISTER) - Sudah Benar!
  async createUser({ username, password, id_warung }) {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password, id_warung) VALUES (?, ?, ?)';
        
        db.query(query, [username, hashedPassword, id_warung], (err, result) => {
          if (err) {
            console.error('❌ Error MySQL saat createUser:', err.message);
            return reject(err);
          }
          resolve({ id_user: result.insertId, username, id_warung });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 2. MENGECEK APAKAH USERNAME SUDAH TERPAKAI ATAU BELUM - Sudah Benar!
  async verifyNewUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT username FROM users WHERE username = ?';
      db.query(query, [username], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0);
      });
    });
  }

  // 3. AMBIL DATA USER BERDASARKAN ID - Sudah Benar!
  async getUserById(id_user) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id_user, username, id_warung FROM users WHERE id_user = ?';
      db.query(query, [id_user], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  }

  // 4. VERIFIKASI KREDENSIAL SAAT LOGIN
  async verifyUserCredential(username, password) {    
    return new Promise((resolve, reject) => {
      // PERBAIKAN: Menambahkan kolom username ke dalam SELECT agar bisa di-resolve dengan aman
      const query = 'SELECT id_user, username, password, id_warung FROM users WHERE username = ?';
      
      db.query(query, [username], async (err, results) => {
        if (err) return reject(err);
        
        if (results.length === 0) {
          return resolve(null);
        }
        
        const { id_user, username: dbUsername, password: hashedPassword, id_warung } = results[0];
        const isPasswordMatch = await bcrypt.compare(password, hashedPassword);
        
        if (!isPasswordMatch) {
          return resolve(null);
        }
        
        // Sekarang dbUsername dijamin aman dan tidak undefined
        return resolve({ id_user, username: dbUsername, id_warung });
      });
    });
  }
}

export default new UserRepositories();