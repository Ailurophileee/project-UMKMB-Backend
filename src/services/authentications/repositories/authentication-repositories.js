import db from '../../../config/db.js'; // Pastikan path ke config DB kamu sudah benar (.js jangan lupa)

class AuthenticationRepositories {

  // 1. MENYIMPAN REFRESH TOKEN BARU
  async addRefreshToken(token) {    
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO authentications (token) VALUES (?)';
      
      db.query(query, [token], (err, result) => {
        if (err) {
          console.error('❌ Error MySQL saat addRefreshToken:', err.message);
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // 2. MEMVERIFIKASI APAKAH REFRESH TOKEN VALID & ADA DI DATABASE
  async verifyRefreshToken(token) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT token FROM authentications WHERE token = ?';
      
      db.query(query, [token], (err, results) => {
        if (err) {
          console.error('❌ Error MySQL saat verifyRefreshToken:', err.message);
          return reject(err);
        }
        
        // Jika token tidak ditemukan di database
        if (results.length === 0) {
          return resolve(false);
        }
        
        resolve(results[0]); // Mengembalikan token jika ditemukan
      });
    });
  }

  // 3. MENGHAPUS REFRESH TOKEN (SAAT USER LOGOUT)
  async deleteRefreshToken(token) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM authentications WHERE token = ?';
      
      db.query(query, [token], (err, result) => {
        if (err) {
          console.error('❌ Error MySQL saat deleteRefreshToken:', err.message);
          return reject(err);
        }
        resolve(result);
      });
    });
  }
}

export default new AuthenticationRepositories();