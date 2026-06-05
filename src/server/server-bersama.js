import express from 'express';
import cors from 'cors';
import routes from '../routes/route-bersama.js';
import ErrorHandler from '../middlewares/error.js';

const app = express();

// 1. Atur konfigurasi CORS yang aman dan fleksibel
const corsOptions = {
  origin: 'https://project-umkmb-frontend.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Memastikan status preflight mengembalikan 200 OK
};

// 2. Pasang middleware CORS di paling atas
app.use(cors(corsOptions));

app.use(express.json());

// 3. Masukkan router utama kamu
app.use(routes);

app.get('/', (req, res) => {
  res.json({
    message: "UMKM Bersama Main Backend API berjalan dengan sukses! 🚀",
    status: "OK"
  });
});

app.use(ErrorHandler);

export default app;