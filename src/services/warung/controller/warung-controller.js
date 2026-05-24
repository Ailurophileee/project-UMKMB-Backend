import warungRepositories from '../repositories/warung-repositories.js';
import response from '../../../utils/response.js';
import NotFoundError from '../../../exceptions/not-found-error.js';
import { warungPayloadSchema } from '../validator/warung-schema.js'; // Sesuaikan nama file skemamu

// 1. CREATE WARUNG
export const createWarung = async (req, res, next) => {
  try {
    // Mengambil data yang sudah lolos dari middleware validasi Joi (req.validated)
    const payload = {
      ...req.validated,
    };

    // PERBAIKAN: Mengubah nama fungsi repo dari createProduct menjadi createWarung
    const warung = await warungRepositories.createWarung(payload);

    return response(res, 201, 'Warung berhasil ditambahkan', {
      id_warung: warung.id_warung,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL WARUNG
export const getWarungs = async (req, res, next) => {
  try {
    // PERBAIKAN: Mengubah productRepositories.findAllProducts() menjadi warungRepositories.findAllWarungs()
    const warungs = await warungRepositories.findAllWarungs();

    return response(res, 200, 'Data warung berhasil diambil', { warungs });
  } catch (error) {
    next(error);
  }
};

// ✅ PERBAIKAN TOTAL FUNGSI GET DETAIL DI BE
export const getWarungById = async (req, res, next) => {
  try {
    const { id } = req.params; 
    
    // 1. Tarik data murni dari database MySQL lewat repositori kamu
    const warung = await warungRepositories.getWarungById(id);
    
    // 2. Jika data kosong di database, lemparkan eror 404
    if (!warung) {
      return next(new NotFoundError('Warung tidak ditemukan'));
    }

    // 3. Kembalikan data warung yang valid ke Front-End
    return response(res, 200, 'Warung ditemukan', warung);
  } catch (error) {
    next(error);
  }
};

export const updateWarung = async (req, res, next) => {
  try {
    const { id } = req.params; // ID warung yang mau diedit dari URL (ex: WRG-002)
    const idWarungSipemilik = req.user.id_warung; // 🔥 ID warung asli si pemilik dari Token JWT (ex: WRG-001)
    
    // 🛡️ PINTU PENGAMAN: Jika ID di URL tidak sama dengan ID di token, TOLAK LANGSUNG!
    if (id !== idWarungSipemilik) {
      return res.status(403).json({
        status: 'fail',
        message: 'Anda tidak memiliki hak akses untuk mengubah data warung ini!'
      });
    }

    // Ambil data warung lama untuk digabungkan
    const existingWarung = await warungRepositories.getWarungById(id);
    if (!existingWarung) {
      return next(new NotFoundError('Warung tidak ditemukan'));
    }

    const mergedPayload = {
      nama_warung: req.body.nama_warung !== undefined ? req.body.nama_warung : existingWarung.nama_warung,
      pemilik: req.body.pemilik !== undefined ? req.body.pemilik : existingWarung.pemilik,
      kota: req.body.kota !== undefined ? req.body.kota : existingWarung.kota,
      kecamatan: req.body.kecamatan !== undefined ? req.body.kecamatan : existingWarung.kecamatan,
      status: req.body.status || existingWarung.status,
    };

    const { error, value } = warungPayloadSchema.validate(mergedPayload);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    await warungRepositories.updateWarungById(id, value);
    return response(res, 200, 'Warung berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

// 5. DELETE WARUNG BY ID
export const deleteWarung = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existingWarung = await warungRepositories.getWarungById(id);
    if (!existingWarung) {
      return next(new NotFoundError('Warung tidak ditemukan'));
    }

    await warungRepositories.deleteWarungById(id);

    return response(res, 200, 'Warung berhasil dihapus');
  } catch (error) {
    next(error);
  }
};