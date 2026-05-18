import Joi from 'joi';

export const userPayloadSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required().messages({
    'string.empty': 'Username tidak boleh kosong',
    'string.min': 'Username minimal terdiri dari 3 karakter',
    'string.max': 'Username maksimal terdiri dari 50 karakter',
    'any.required': 'Username wajib diisi',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password tidak boleh kosong',
    'string.min': 'Password minimal terdiri dari 6 karakter',
    'any.required': 'Password wajib diisi',
  }),
  // MENGGANTIKAN ROLE MENJADI ID_WARUNG
  id_warung: Joi.string().trim().required().messages({
    'string.empty': 'ID Warung tidak boleh kosong',
    'any.required': 'ID Warung wajib diisi',
  }),
});

// Kita buatkan sekalian skema khusus untuk Login (karena login hanya butuh username & password)
export const loginPayloadSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'string.empty': 'Username wajib diisi untuk login',
    'any.required': 'Username wajib diisi',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password wajib diisi untuk login',
    'any.required': 'Password wajib diisi',
  }),
});