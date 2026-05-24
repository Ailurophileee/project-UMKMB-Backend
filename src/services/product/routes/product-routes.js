import { validate } from "../../../middlewares/validate.js";
import { productPayloadSchema, updateProductPayloadSchema } from "../validator/product-schema.js";
import { createProduct, getProductById, getProducts, updateProduct, deleteProduct } from "../controller/product-controller.js";
import authenticateToken from "../../../middlewares/auth.js"; // 🔥 Impor middleware auth kamu
import express from 'express';

const router = express.Router();

// Semua rute produk di bawah ini sekarang wajib membawa Header: Authorization -> Bearer <token>

// 1. Mengambil semua data produk milik warung yang sedang login
router.get('/', authenticateToken, getProducts);

// 2. Mengambil detail satu produk berdasarkan ID produk
router.get('/:id', authenticateToken, getProductById);

// 3. Menambah produk baru ke warung yang sedang login
router.post('/', authenticateToken, validate(productPayloadSchema), createProduct);

// 4. Mengubah data produk berdasarkan ID produk
router.put('/:id', authenticateToken, validate(updateProductPayloadSchema), updateProduct);

// 5. Menghapus produk berdasarkan ID produk
router.delete('/:id', authenticateToken, deleteProduct);

export default router;