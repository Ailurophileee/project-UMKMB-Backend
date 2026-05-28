import express from 'express';
import cors from 'cors'; // Pastikan cors di-import paling atas
import routes from '../routes/route-bersama.js';
import ErrorHandler from '../middlewares/error.js';

const app = express();

// 1. Definisikan opsi CORS secara spesifik
const corsOptions = {
  origin: 'https://project-umkmb-frontend.vercel.app', // Hanya izinkan domain vercel kamu
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Menangani browser lama atau case tertentu
};

// 2. Pasang middleware CORS untuk semua request
app.use(cors(corsOptions));

// 3. PENTING: Langsung potong & jawab sukses jika ada request bertipe OPTIONS (Preflight)
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(routes);
app.use(ErrorHandler);

export default app;