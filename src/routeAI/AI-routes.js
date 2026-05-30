// src/services/cashflow-forecast/routes/cf-route.js (atau ai-routes.js)
import express from 'express';
import { getCashflowForecast } from '../services/cashflow-forecast/controller/cf-controller.js'; // Controller asli cashflow-mu
import { getBCGMatrix } from '../services/BCG-matrix/controller/bm-controller.js';// Sesuaikan path controller BCG-mu
import authenticateToken from '../middlewares/auth.js';
import { getAIAdvisory } from '../services/advisory/controller/advisory-controller.js';

const router = express.Router();

// 1. Route untuk Cashflow Forecast
router.get('/cashflow-forecast', authenticateToken, getCashflowForecast);

// 2. Route untuk BCG Matrix
router.get('/bcg-matrix', authenticateToken, getBCGMatrix);

// 3. Route untuk Advisory
router.get('/advisory', authenticateToken, getAIAdvisory)

export default router;