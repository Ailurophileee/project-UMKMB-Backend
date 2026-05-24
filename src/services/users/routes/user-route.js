import { Router } from 'express';
import { createUser, getUserById } from '../controller/user-controller.js';
import { validate } from '../../../middlewares/validate.js';
// PERBAIKAN: Mengimpor registerPayloadSchema (Nama file disesuaikan dengan fisik .js kamu)
import { registerPayloadSchema } from '../validator/user-schema.js'; 

const router = Router();
 
// PERBAIKAN: Menggunakan endpoint /register dan memasang skema gabungan terbaru
router.post('/register', validate(registerPayloadSchema), createUser);

// Mengambil profil user berdasarkan id_user
router.get('/:id', getUserById);
 
export default router;