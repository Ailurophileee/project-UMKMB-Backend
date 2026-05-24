import productRepositories from '../repositories/product-repositories.js'; 
import response from '../../../utils/response.js';
import NotFoundError from '../../../exceptions/not-found-error.js';
import { productPayloadSchema, updateProductPayloadSchema } from '../validator/product-schema.js';

// 1. CREATE PRODUCT
export const createProduct = async (req, res, next) => {
  try {
    // 🔥 PERBAIKAN: Ambil id_warung langsung dari token JWT (req.user)
    const id_warung = req.user.id_warung;

    // Masukkan data validasi Joi bersama dengan id_warung yang murni dari sistem
    const payload = {
      ...req.validated,
      id_warung // Otomatis mengunci produk ini ke warung si pengguna
    };

    const product = await productRepositories.createProduct(payload);

    return response(res, 201, 'Produk berhasil ditambahkan', {
      id_produk: product.id_produk,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL PRODUCTS
export const getProducts = async (req, res, next) => {
  try {
    // 🔥 PERBAIKAN: Ambil id_warung dari token agar toko hanya bisa melihat produk miliknya sendiri
    const id_warung = req.user.id_warung;

    // Oper id_warung ke fungsi pencari di repository (Kueri DB: SELECT * FROM produk WHERE id_warung = ?)
    const products = await productRepositories.findAllProducts(id_warung);

    return response(res, 200, 'Data produk berhasil diambil', { products });
  } catch (error) {
    next(error);
  }
};

// 3. GET PRODUCT BY ID
export const getProductById = async (req, res, next) => {
  try { // Tambahkan blok try-catch agar error database tidak membuat aplikasi hang
    const { id } = req.params;
    const id_warung = req.user.id_warung; // Ambil token pengenal warung

    const product = await productRepositories.getProductById(id);

    // 🛡️ PINTU PENGAMAN 1: Cek apakah produknya eksis dan benar milik warung yang bersangkutan
    if (!product || product.id_warung !== id_warung) {
      return next(new NotFoundError('Produk tidak ditemukan atau Anda tidak memiliki akses'));
    }

    return response(res, 200, 'Produk ditemukan', product);
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE PRODUCT BY ID
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_warung = req.user.id_warung; // Ambil token pengenal warung
    
    // Ambil data produk lama
    const existingProduct = await productRepositories.getProductById(id);
    
    // 🛡️ PINTU PENGAMAN 2: Tolak jika produk bukan kepunyaan warung yang sedang login
    if (!existingProduct || existingProduct.id_warung !== id_warung) {
      return next(new NotFoundError('Produk tidak ditemukan atau Anda tidak memiliki hak akses mengubahnya'));
    }

    const mergedPayload = {
      id_warung: id_warung, // 🔥 DIKUNCI: Tetap pakai id_warung dari token, bukan dari req.body bebas
      nama_produk: req.body.nama_produk !== undefined ? req.body.nama_produk : existingProduct.nama_produk,
      harga_jual: req.body.harga_jual !== undefined ? Number(req.body.harga_jual) : existingProduct.harga_jual,
      harga_pokok: req.body.harga_pokok !== undefined ? Number(req.body.harga_pokok) : existingProduct.harga_pokok,
      kategori_produk: req.body.kategori_produk || existingProduct.kategori_produk,
      status: req.body.status || existingProduct.status,
    };

    // Validasi data gabungan menggunakan skema Joi
    const { error, value } = updateProductPayloadSchema.validate(mergedPayload);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    await productRepositories.updateProductById(id, value);

    return response(res, 200, 'Produk berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

// 5. DELETE PRODUCT BY ID
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_warung = req.user.id_warung; // Ambil token pengenal warung
    
    const existingProduct = await productRepositories.getProductById(id);
    
    // 🛡️ PINTU PENGAMAN 3: Pastikan yang menghapus produk adalah pemilik aslinya
    if (!existingProduct || existingProduct.id_warung !== id_warung) {
      return next(new NotFoundError('Produk tidak ditemukan atau Anda tidak memiliki hak akses menghapusnya'));
    }

    await productRepositories.deleteProductById(id);

    return response(res, 200, 'Produk berhasil dihapus');
  } catch (error) {
    next(error);
  }
};