// src/services/transaksi/controller/transaksi-controller.js
import transaksiRepositories from '../repositories/transaksi-repositories.js';
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';

// 1. TAMBAH TRANSAKSI BARU
export const createTransaksi = async (req, res, next) => {
  try {
    // 👑 AMBIL OTOMATIS ID WARUNG DARI JWT TOKEN
    const id_warung = req.user.id_warung;

    // Gabungkan data inputan yang lolos Joi dengan id_warung asli dari sistem
    const payload = {
      ...req.validated,
      id_warung,
    };

    const result = await transaksiRepositories.createTransaksi(payload);

    if (!result) {
      return next(new InvariantError('Transaksi gagal dicatatkan'));
    }

    return response(res, 201, 'Transaksi berhasil dicatatkan', {
     transaksi: {
        id_transaksi: result.id_transaksi, 
        id_warung: id_warung,
        id_produk: req.validated.id_produk || null,
        tanggal: result.tanggal,           // 🔥 PERBAIKAN: Ambil murni dari hasil repo
        jam_transaksi: result.jam_transaksi, // 🔥 PERBAIKAN: Ambil murni dari hasil repo
        jenis: req.validated.jenis,
        kategori: req.validated.kategori,
        nominal: req.validated.nominal,
        qty: req.validated.qty !== undefined ? req.validated.qty : null,
        metode_bayar: req.validated.metode_bayar,
        catatan: req.validated.catatan || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL TRANSAKSI (KHUSUS WARUNG YANG SEDANG LOGIN)
export const getTransaksiHistory = async (req, res, next) => {
  try {
    // 👑 KUNCI DATA: Hanya ambil transaksi milik warung yang sedang login
    const id_warung = req.user.id_warung;

    const history = await transaksiRepositories.findAllTransaksiByWarung(id_warung);

    return response(res, 200, 'Riwayat transaksi berhasil diambil', { 
      transaksi: history 
    });
  } catch (error) {
    next(error);
  }
};

// Tambahkan fungsi ini di dalam transaksi-controller.js kamu

export const getDashboardSummary = async (req, res, next) => {
  try {
    const id_warung = req.user.id_warung; // Ambil otomatis dari JWT token guard
    const summary = await transaksiRepositories.getTransaksiSummary(id_warung);

    return response(res, 200, 'Ringkasan dashboard berhasil dihitung', summary);
  } catch (error) {
    next(error);
  }
};

// src/services/transaksi/controller/transaksi-controller.js
// (Pastikan instance repositori kamu sudah di-import di atas, misal: const repo = new TransaksiRepository())

// src/services/transaksi/controller/transaksi-controller.js

export const editTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const id_warung = req.user.id_warung; 
    const updateData = req.body;

    // 🔥 PERBAIKAN: Langsung panggil variabel objek default transaksiRepositories dari atas file
    const affectedRows = await transaksiRepositories.updateTransaksi(id, id_warung, updateData);

    if (affectedRows === 0) {
      return res.status(404).json({ status: 404, message: 'Transaksi tidak ditemukan atau bukan milik warung Anda.' });
    }

    return res.status(200).json({ status: 200, message: 'Transaksi berhasil diperbarui! 📝' });
  } catch (error) {
    console.error('Eror di editTransaksi controller:', error.message);
    return res.status(500).json({ status: 500, message: 'Internal Server Error.' });
  }
};

export const removeTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const id_warung = req.user.id_warung;

    // 🔥 PERBAIKAN: Langsung panggil variabel objek default transaksiRepositories dari atas file
    const affectedRows = await transaksiRepositories.deleteTransaksi(id, id_warung);

    if (affectedRows === 0) {
      return res.status(404).json({ status: 404, message: 'Transaksi tidak ditemukan.' });
    }

    return res.status(200).json({ status: 200, message: 'Transaksi berhasil dihapus! 🗑️' });
  } catch (error) {
    console.error('Eror di removeTransaksi controller:', error.message);
    return res.status(500).json({ status: 500, message: 'Internal Server Error.' });
  }
};