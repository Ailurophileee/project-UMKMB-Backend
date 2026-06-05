import express from 'express';
import cors from 'cors';
import routes from '../routes/route-bersama.js';
import ErrorHandler from '../middlewares/error.js';

const app = express();

const allowedOrigins = [
  'https://project-umkmb-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Akses diblokir oleh kebijakan CORS Backend Salamah!'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 
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