import express from 'express';
import cors from 'cors';
import routes from '../routes/route-bersama.js';
import ErrorHandler from '../middlewares/error.js';

const app = express();

const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));

// PANDUAN EXPRESS 5: Gunakan (.*) bukan * telanjang
app.options('(.*)', cors(corsOptions));

app.use(express.json());
app.use(routes);
app.use(ErrorHandler);

export default app;