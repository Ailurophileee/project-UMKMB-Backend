import authenticationRepositories from '../repositories/authentication-repositories.js';
import userRepositories from '../../users/repositories/user-repositories.js';
import TokenManager from '../../../security/token-manager.js';
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import AuthenticationError from '../../../exceptions/authentication-error.js';

// 1. LOGIN (POST /api/auth/login) - Sudah Sangat Bagus!
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.validated || req.body;
    
    const user = await userRepositories.verifyUserCredential(username, password);
   
    if (!user) {
      return next(new AuthenticationError('Kredensial yang Anda berikan salah'));
    }
   
    const tokenPayload = { 
      id_user: user.id_user, 
      id_warung: user.id_warung 
    };

    const accessToken = TokenManager.generateAccessToken(tokenPayload);
    const refreshToken = TokenManager.generateRefreshToken(tokenPayload);
   
    await authenticationRepositories.addRefreshToken(refreshToken);
   
    return response(res, 200, 'Authentication berhasil ditambahkan', {
      accessToken,
      refreshToken,
      user: {
        id_user: user.id_user,
        username: user.username,
        id_warung: user.id_warung
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
   
    // Jika tidak ada di DB, langsung tolak sebelum membuang waktu memverifikasi JWT
    if (!result) {
      return next(new InvariantError('Refresh token tidak ditemukan di database'));
    }
   
    // 🔥 PERBAIKAN: Membungkus verifikasi JWT agar jika token cacat/expired tidak membuat app crash
    let decoded;
    try {
      decoded = TokenManager.verifyRefreshToken(refreshToken);
    } catch (jwtError) {
      // Jika token kedaluwarsa, sekalian hapus dari DB agar bersih
      await authenticationRepositories.deleteRefreshToken(refreshToken);
      return next(new AuthenticationError('Refresh token tidak valid atau telah kedaluwarsa'));
    }
    
    const accessToken = TokenManager.generateAccessToken({ 
      id_user: decoded.id_user, 
      id_warung: decoded.id_warung 
    });
   
    return response(res, 200, 'Access Token berhasil diperbarui', { accessToken });
  } catch (error) {
    next(error);
  }
};

// 3. LOGOUT (DELETE /api/auth/logout)
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.validated || req.body;
   
    const result = await authenticationRepositories.verifyRefreshToken(refreshToken);
   
    if (!result) {
      return next(new InvariantError('Refresh token tidak valid'));
    }
   
    await authenticationRepositories.deleteRefreshToken(refreshToken);
   
    return response(res, 200, 'Refresh token berhasil dihapus (Logout sukses)');
  } catch (error) {
    next(error);
  }
};