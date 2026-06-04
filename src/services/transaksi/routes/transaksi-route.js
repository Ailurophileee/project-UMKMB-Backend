// src/services/transaksi/routes/transaksi-routes.js
import express from 'express';
import { validate } from '../../../middlewares/validate.js';
import { transaksiPayloadSchema } from '../validator/transaksi-schema.js';
import { 
  createTransaksi, 
  getTransaksiHistory, 
  getDashboardSummary,
  editTransaksi,    // 🔥 Tambahkan ini
  removeTransaksi   // 🔥 Tambahkan ini
} from '../controller/transaksi-controller.js';
import authenticateToken from '../../../middlewares/auth.js'; 

const router = express.Router();

// 1. Mencatat transaksi baru
router.post('/', authenticateToken, validate(transaksiPayloadSchema), createTransaksi);

// 2. Melihat seluruh riwayat transaksi
router.get('/', authenticateToken, getTransaksiHistory);

// 3. Melihat ringkasan kalkulasi dashboard widget
router.get('/summary', authenticateToken, getDashboardSummary);

// 4. Mengubah data transaksi lama berdasarkan id_transaksi
// Menggunakan validator schema yang sama agar data inputan baru tetap terjaga kualitasnya
router.put('/:id', authenticateToken, validate(transaksiPayloadSchema), editTransaksi);

// 5. Menghapus data transaksi
router.delete('/:id', authenticateToken, removeTransaksi);

export default router;