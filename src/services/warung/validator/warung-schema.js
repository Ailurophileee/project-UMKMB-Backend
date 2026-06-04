import Joi from 'joi';

// 1. SKEMA UNTUK CREATE WARUNG (Menerima input dari form registrasi FE)
export const warungPayloadSchema = Joi.object({
 id_warung: Joi.string()
  .pattern(/^WRG-\d{3}$/) // \d{3} memastikan tepat harus 3 digit angka (0-9)
  .optional()
  .messages({
    'string.pattern.base': 'Format id_warung harus berupa urutan angka standar (WRG-001)',
  }),
    
  nama_warung: Joi.string().min(3).required().messages({
    'any.required': 'Nama warung wajib diisi',
    'string.empty': 'Nama warung tidak boleh kosong'
  }),
  
  pemilik: Joi.string().required().messages({
    'any.required': 'Nama pemilik wajib diisi'
  }),
  
  kota: Joi.string().required().messages({
    'any.required': 'Kota wajib diisi'
  }),
  
  kecamatan: Joi.string().required().messages({
    'any.required': 'Kecamatan wajib diisi'
  }),
  
  // Tanggal dan status dibuat opsional di tingkat payload karena BE yang akan menyuntikkan nilainya
  tanggal_daftar: Joi.string().isoDate().optional(), 
  status: Joi.string().valid('Aktif', 'Nonaktif').default('Aktif').optional(),
});

// 2. SKEMA UNTUK UPDATE WARUNG
export const updateWarungPayloadSchema = warungPayloadSchema.fork(
  [
    'id_warung',
    'nama_warung',
    'pemilik',
    'kota',
    'kecamatan',
    'tanggal_daftar',
    'status'
  ],
  (schema) => schema.optional()
);