import Joi from 'joi';

// 1. SKEMA UNTUK CREATE PRODUCT (Semua wajib diisi sesuai tabel spesifikasi)
export const productPayloadSchema = Joi.object({
  id_produk: Joi.string()
    .pattern(/^PRD-[A-Z0-9]+-\d+$/) // Validasi opsional format PRD-XXX-NNN
    .required()
    .messages({
      'string.pattern.base': 'Format id_produk harus sesuai standar (PRD-XXX-NNN)',
    }),
  id_warung: Joi.string().required(),
  nama_produk: Joi.string().required(),
  harga_jual: Joi.number().integer().min(0).required(), // INTEGER, tidak boleh minus
  harga_pokok: Joi.number().integer().min(0).required(), // INTEGER untuk kalkulasi COGS BCG
  kategori_produk: Joi.string()
    .valid('Sembako', 'Mie & Snack', 'Minuman', 'Kebersihan', 'Gas & Energi', 'Rokok')
    .required()
    .messages({
      'any.only': 'Kategori produk harus salah satu dari: Sembako, Mie & Snack, Minuman, Kebersihan, Gas & Energi, atau Rokok',
    }),
  status: Joi.string().valid('Aktif', 'Nonaktif').default('Aktif').required(),
});

// 2. SKEMA UNTUK UPDATE PRODUCT (Mengubah semua field menjadi .optional() secara otomatis)
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