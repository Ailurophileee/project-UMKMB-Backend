// src/services/users/validator/users-schema.js
import Joi from 'joi';

export const registerPayloadSchema = Joi.object({
  // --- Kolom Akun User ---
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

  // --- Kolom Profil Warung (Daftar Barengan) ---
  nama_warung: Joi.string().trim().required().messages({
    'string.empty': 'Nama warung tidak boleh kosong',
    'any.required': 'Nama warung wajib diisi',
  }),
  pemilik: Joi.string().trim().required().messages({
    'string.empty': 'Nama pemilik tidak boleh kosong',
    'any.required': 'Nama pemilik wajib diisi',
  }),
  kota: Joi.string().trim().required().messages({
    'string.empty': 'Kota tidak boleh kosong',
    'any.required': 'Kota wajib diisi',
  }),
  kecamatan: Joi.string().trim().required().messages({
    'string.empty': 'Kecamatan tidak boleh kosong',
    'any.required': 'Kecamatan wajib diisi',
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