import userRepositories from '../repositories/user-repositories.js';
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import NotFoundError from '../../../exceptions/not-found-error.js';

// 1. REGISTER / CREATE USER
export const createUser = async (req, res, next) => {
  try {
    // Ambil data yang sudah lolos validasi middleware Joi (req.validated)
    const { username, password, id_warung } = req.validated || req.body; 

    // 2. SESUAIKAN: Cek keunikan berdasarkan USERNAME di MySQL (Bukan Email)
    const isUsernameExist = await userRepositories.verifyNewUsername(username);
    if (isUsernameExist) {
      return next(new InvariantError('Gagal menambahkan user. Username sudah digunakan.'));
    }
   
    // 3. SESUAIKAN: Kirim data murni (username, password, id_warung) ke MySQL repository
    const user = await userRepositories.createUser({
      username,
      password,
      id_warung,
    });
   
    if (!user) {
      return next(new InvariantError('User gagal ditambahkan'));
    }
   
    // Kembalikan response sukses beserta id_user yang dibuat otomatis oleh MySQL (AUTO_INCREMENT)
    return response(res, 201, 'User berhasil ditambahkan', {
      id_user: user.id_user,
      username: user.username
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET USER BY ID
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params; // ini akan mengambil id_user
    const user = await userRepositories.getUserById(id);
   
    if (!user) {
        return next(new NotFoundError('User tidak ditemukan'));
    }
   
    // 4. RAPIKAN: Keluarkan data yang sesuai dengan kolom tabel users MySQL kamu
    return response(res, 200, 'User ditemukan', {
      id_user: user.id_user,
      username: user.username,
      id_warung: user.id_warung,
    });
  } catch (error) {
    next(error);
  }
};