import productRepositories from '../repositories/product-repositories.js'; 
import response from '../../../utils/response.js';
import NotFoundError from '../../../exceptions/not-found-error.js';
import { productPayloadSchema } from '../validator/product-schema.js';

// 1. CREATE PRODUCT
export const createProduct = async (req, res, next) => {
  try {
    // Mengambil data yang sudah lolos dari middleware validasi Joi (req.validated)
    const payload = {
      ...req.validated,
    
    };

    const product = await productRepositories.createProduct(payload);

    return response(res, 201, 'Produk berhasil ditambahkan', {
      id_produk: product.id_produk,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL PRODUCTS (Perbaikan: Kosongkan isi dalam kurung findAllProducts)
export const getProducts = async (req, res, next) => {
  try {
    // Kosongkan parameter di dalam fungsi ini agar tidak membuat Promise di Repo crash/stuck
    const products = await productRepositories.findAllProducts();

    return response(res, 200, 'Data produk berhasil diambil', { products });
  } catch (error) {
    next(error);
  }
};

// 3. GET PRODUCT BY ID
export const getProductById = async (req, res, next) => {
    const { id } = req.params;
    const product = await productRepositories.getProductById(id);

    if (!product) {
      return next(new NotFoundError('Produk tidak ditemukan'));
    }

    return response(res, 200, 'Produk ditemukan', product);
};

// 4. UPDATE PRODUCT BY ID
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Ambil data produk lama untuk digabungkan jika user hanya update beberapa field
    const existingProduct = await productRepositories.getProductById(id);
    if (!existingProduct) {
      return next(new NotFoundError('Produk tidak ditemukan'));
    }

    const mergedPayload = {
      id_warung: req.body.id_warung || existingProduct.id_warung,
      nama_produk: req.body.nama_produk !== undefined ? req.body.nama_produk : existingProduct.nama_produk,
      harga_jual: req.body.harga_jual !== undefined ? Number(req.body.harga_jual) : existingProduct.harga_jual,
      harga_pokok: req.body.harga_pokok !== undefined ? Number(req.body.harga_pokok) : existingProduct.harga_pokok,
      kategori_produk: req.body.kategori_produk || existingProduct.kategori_produk,
      status: req.body.status || existingProduct.status,
    };

    // Validasi data gabungan menggunakan skema Joi
    const { error, value } = productPayloadSchema.validate(mergedPayload);
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
    
    const existingProduct = await productRepositories.getProductById(id);
    if (!existingProduct) {
      return next(new NotFoundError('Produk tidak ditemukan'));
    }

    await productRepositories.deleteProductById(id);

    return response(res, 200, 'Produk berhasil dihapus');
  } catch (error) {
    next(error);
  }
};