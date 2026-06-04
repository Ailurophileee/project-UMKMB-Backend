import userRepositories from '../repositories/user-repositories.js';
// 🔥 Tambahkan impor repositori warung untuk membuat warung secara estafet
import warungRepositories from '../../warung/repositories/warung-repositories.js'; 
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import NotFoundError from '../../../exceptions/not-found-error.js';

// 1. REGISTER / GABUNGAN CREATE USER DAN WARUNG
export const createUser = async (req, res, next) => {
  try {
    // Ambil semua data gabungan yang sudah lolos validasi Joi (registerPayloadSchema)
    const { username, password, nama_warung, pemilik, kota, kecamatan } = req.validated || req.body; 

    // 2. Cek keunikan username terlebih dahulu sebelum membuat apa pun
    const isUsernameExist = await userRepositories.verifyNewUsername(username);
    if (isUsernameExist) {
      return next(new InvariantError('Gagal menambahkan user. Username sudah digunakan.'));
    }
   
    // 3. JALANKAN ESTAFET 1: Buat data warung baru terlebih dahulu
    // Data ini akan diproses di warungRepository dan menghasilkan ID otomatis (ex: WRG-001)
    const warung = await warungRepositories.createWarung({
      nama_warung,
      pemilik,
      kota,
      kecamatan,
      // tanggal_daftar dan status akan otomatis di-handle default oleh repo warung
    });

    if (!warung || !warung.id_warung) {
      return next(new InvariantError('Gagal memproses data usaha warung.'));
    }

    const idWarungTerbentuk = warung.id_warung;

    // 4. JALANKAN ESTAFET 2: Kirim data akun beserta id_warung ke MySQL repository user
    const user = await userRepositories.createUser({
      username,
      password, // Bcrypt hash sudah aman dijalankan di dalam userRepositories.createUser kamu
      id_warung: idWarungTerbentuk, // Masuk sebagai Foreign Key!
    });
   
    if (!user) {
      return next(new InvariantError('User gagal ditambahkan'));
    }
   
    // Kembalikan response sukses gabungan ke Front-End
    return response(res, 201, 'Registrasi akun dan tempat usaha berhasil ditambahkan', {
      id_user: user.id_user,
      username: user.username,
      id_warung: idWarungTerbentuk
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET USER BY ID (Sudah Sempurna!)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params; // mengambil id_user
    const user = await userRepositories.getUserById(id);
   
    if (!user) {
        return next(new NotFoundError('User tidak ditemukan'));
    }
   
    return response(res, 200, 'User ditemukan', {
      id_user: user.id_user,
      username: user.username,
      id_warung: user.id_warung,
    });
  } catch (error) {
    next(error);
  }
};