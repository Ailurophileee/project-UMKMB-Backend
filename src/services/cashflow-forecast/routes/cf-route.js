import express from 'express';
import { getCashflowForecast } from '../controller/cf-controller.js';
import authenticateToken from '../../../middlewares/auth.js';// 🔥 Gunakan middleware satpam JWT milikmu

const router = express.Router();

// Cukup gunakan rute GET, karena Front-End hanya meminta data pasif hasil ramalan AI
router.get('/forecast', authenticateToken, getCashflowForecast);

export default router;