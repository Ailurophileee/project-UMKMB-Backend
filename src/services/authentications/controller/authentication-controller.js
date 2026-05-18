import authenticationRepositories from '../repositories/authentication-repositories.js';
import userRepositories from '../../users/repositories/user-repositories.js';
import TokenManager from '../../../security/token-manager.js';
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import AuthenticationError from '../../../exceptions/authentication-error.js';

// 1. LOGIN (POST /api/auth/login)
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.validated || req.body;
    
    // Kemarin fungsi ini mengembalikan objek { id_user, username, id_warung }
    const user = await userRepositories.verifyUserCredential(username, password);
   
    if (!user) {
      return next(new AuthenticationError('Kredensial yang Anda berikan salah'));
    }
   
    // PENTING: Kita masukkan id_user DAN id_warung ke dalam isi (payload) JWT Token
    const tokenPayload = { 
      id_user: user.id_user, 
      id_warung: user.id_warung 
    };

    const accessToken = TokenManager.generateAccessToken(tokenPayload);
    const refreshToken = TokenManager.generateRefreshToken(tokenPayload);
   
    // Simpan refresh token murni ke tabel 'authentications' MySQL yang baru kamu buat
    await authenticationRepositories.addRefreshToken(refreshToken);
   
    return response(res, 200, 'Authentication berhasil ditambahkan', {
      accessToken,
      refreshToken,
      user: {
        id_user: user.id_user,
        username: user.username,
        id_warung: user.id_warung // FE langsung dapet id_warung untuk kebutuhan filter dashboard
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. REFRESH TOKEN (POST /api/auth/refresh-token)
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.validated || req.body;
   
    const result = await authenticationRepositories.verifyRefreshToken(refreshToken);
   
    if (!result) {
      return next(new InvariantError('Refresh token tidak valid atau tidak ditemukan di database'));
    }
   
    // Mengurai kembali isi token untuk mengambil data user & warung
    const decoded = TokenManager.verifyRefreshToken(refreshToken);
    
    // Buat Access Token baru dengan payload yang sama
    const accessToken = TokenManager.generateAccessToken({ 
      id_user: decoded.id_user, 
      id_warung: decoded.id_warung 
    });
   
    return response(res, 200, 'Access Token berhasil diperbarui', { accessToken });
  } catch (error) {
    next(error);
  }
};

// 3. LOGOUT (DELETE /api/auth/logout atau POST /api/auth/logout)
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.validated || req.body;
   
    const result = await authenticationRepositories.verifyRefreshToken(refreshToken);
   
    if (!result) {
      return next(new InvariantError('Refresh token tidak valid'));
    }
   
    // Hapus token dari tabel MySQL agar tidak bisa disalahgunakan lagi
    await authenticationRepositories.deleteRefreshToken(refreshToken);
   
    return response(res, 200, 'Refresh token berhasil dihapus (Logout sukses)');
  } catch (error) {
    next(error);
  }
};