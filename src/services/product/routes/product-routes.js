import { validate } from "../../../middlewares/validate.js";
import { productPayloadSchema, updateProductPayloadSchema } from "../validator/product-schema.js";
import { createProduct, getProductById, getProducts, updateProduct, deleteProduct } from "../controller/product-controller.js";
import express from 'express';

const router = express.Router();

// 1. Mengambil semua data produk (Bisa pakai query filter ?kategori_produk=... dll)
router.get('/', getProducts);

// 2. Mengambil detail satu produk berdasarkan ID-nya
router.get('/:id', getProductById);

// 3. Menambah produk baru (Validasi skema create wajib lolos)
router.post('/', validate(productPayloadSchema), createProduct);

// 4. Mengubah data produk berdasarkan ID (Validasi skema update opsional lolos)
router.put('/:id', validate(updateProductPayloadSchema), updateProduct);

// 5. Menghapus produk berdasarkan ID
router.delete('/:id', deleteProduct);

export default router;