import { validate } from "../../../middlewares/validate.js";
import { warungPayloadSchema, updateWarungPayloadSchema } from "../validator/warung-schema.js";
import { getWarungById, getWarungs, updateWarung, deleteWarung } from "../controller/warung-controller.js";
import authenticateToken from "../../../middlewares/auth.js"; // 🔥 Impor middleware satpammu
import express from 'express';

const router = express.Router();

// Semua rute di bawah ini sekarang harus membawa Header: Authorization -> Bearer <token>

// Admin ingin melihat semua warung
router.get('/', authenticateToken, getWarungs);

// User/Admin ingin melihat detail warung miliknya
router.get('/:id', authenticateToken, getWarungById);

// Pemilik warung ingin mengubah profil warungnya (Hanya boleh jika sudah login)
router.put('/:id', authenticateToken, validate(updateWarungPayloadSchema), updateWarung);

// Pemutusan kemitraan / hapus warung (Sangat sensitif, wajib login)
router.delete('/:id', authenticateToken, deleteWarung);

export default router;