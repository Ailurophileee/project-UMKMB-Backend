import express from 'express';
import routes from '../routes/route-bersama.js';
import cors from 'cors';
import ErrorHandler from '../middlewares/error.js';
const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);
app.use(ErrorHandler);

export default app;