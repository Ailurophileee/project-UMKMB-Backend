import Joi from 'joi';

// 1. SKEMA UNTUK CREATE PRODUCT (Disesuaikan dengan alur Auth & Auto-ID)
export const productPayloadSchema = Joi.object({
  // Hilangkan .required() karena ID dibuat otomatis oleh database/repository
  id_produk: Joi.string()
    .pattern(/^PRD-[A-Z0-9]+-\d+$/)
    .messages({
      'string.pattern.base': 'Format id_produk harus sesuai standar (PRD-XXX-NNN)',
    }),

  // Hilangkan .required() karena diambil otomatis dari token JWT di controller
  id_warung: Joi.string(),

  nama_produk: Joi.string().required().messages({
    'any.required': 'Nama produk wajib diisi',
  }),
  harga_jual: Joi.number().integer().min(0).required().messages({
    'any.required': 'Harga jual wajib diisi',
  }), 
  harga_pokok: Joi.number().integer().min(0).required().messages({
    'any.required': 'Harga pokok wajib diisi',
  }), 
  kategori_produk: Joi.string()
    .valid('Sembako', 'Mie & Snack', 'Minuman', 'Kebersihan', 'Gas & Energi', 'Rokok')
    .required()
    .messages({
      'any.only': 'Kategori produk harus salah satu dari: Sembako, Mie & Snack, Minuman, Kebersihan, Gas & Energi, atau Rokok',
      'any.required': 'Kategori produk wajib diisi',
    }),
  // Sesuai diskusi sebelumnya, pastikan tidak ada .required() di sini agar .default() bekerja
  status: Joi.string().valid('Aktif', 'Nonaktif').default('Aktif'),
});

// 2. SKEMA UNTUK UPDATE PRODUCT (Sudah benar memanfaatkan fork)
export const updateProductPayloadSchema = productPayloadSchema.fork(
  [
    'id_produk',
    'id_warung',
    'nama_produk',
    'harga_jual',
    'harga_pokok',
    'kategori_produk',
    'status'
  ],
  (schema) => schema.optional()
);