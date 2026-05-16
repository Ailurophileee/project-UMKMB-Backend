import { Router } from 'express';

const router = Router();
 
//router.use('/', users);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API Terhubung!' });
});

export default router;
