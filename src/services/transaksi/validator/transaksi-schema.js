// src/services/transaksi/validator/transaksi-schema.js
import Joi from 'joi';

export const transaksiPayloadSchema = Joi.object({
  // id_produk boleh kosong (null) jika jenis transaksi adalah pengeluaran non-produk
  id_produk: Joi.string().allow('', null).optional(),
  
  jenis: Joi.string().valid('Pemasukan', 'Pengeluaran').required().messages({
    'any.only': 'Jenis transaksi harus antara Pemasukan atau Pengeluaran',
    'any.required': 'Jenis transaksi wajib ditentukan',
  }),
  
  kategori: Joi.string().valid('Penjualan', 'HPP', 'Operasional', 'Overhead').required().messages({
    'any.only': 'Kategori harus salah satu dari: Penjualan, HPP, Operasional, atau Overhead',
    'any.required': 'Kategori transaksi wajib ditentukan',
  }),
  
  nominal: Joi.number().integer().min(1).required().messages({
    'number.min': 'Nominal tidak boleh bernilai minus',
    'any.required': 'Nominal transaksi wajib diisi',
  }),

  jam_transaksi: Joi.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/).required().messages({
    'string.pattern.base': 'Format jam_transaksi harus berupa HH:MM:SS',
    'any.required': 'Jam transaksi wajib ada untuk mendukung model DS',
  }),
  
  // qty boleh kosong jika transaksinya adalah pengeluaran
  qty: Joi.number().integer().min(1).allow(null).optional().messages({
    'number.min': 'Jumlah item minimal bernilai 1 jika diisi',
  }),
  
  metode_bayar: Joi.string().valid('Cash', 'Transfer', 'QRIS').required().messages({
    'any.only': 'Metode bayar harus salah satu dari: Cash, Transfer, atau QRIS',
    'any.required': 'Metode bayar wajib ditentukan',
  }),
  
  catatan: Joi.string().allow('', null).max(500).optional(),
});