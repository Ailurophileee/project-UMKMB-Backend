import express from 'express';
import routes from '../routes/route-bersama.js';
import cors from 'cors';
import ErrorHandler from '../middlewares/error.js';
const app = express();

app.use(cors({
  origin: 'https://project-umkmb-frontend.vercel.app', // atau gunakan '*' jika ingin bebas
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(routes);
app.use(ErrorHandler);

export default app;