import { Router } from 'express';
import product from '../services/product/routes/product-routes.js';
import user from '../services/users/routes/user-route.js';
import authentication from '../services/authentications/routes/authentication-routes.js';
import warung from '../services/warung/routes/warung-route.js';
import transaksi from '../services/transaksi/routes/transaksi-route.js'
import routeAI from '../routeAI/AI-routes.js'
const router = Router();
 
router.use('/api/produk', product);
router.use('/api/transactions', transaksi);
router.use('/api/register', user);
router.use('/api/authentication', authentication);
router.use('/api/warung', warung);
router.use('/api/ai', routeAI);


export default router;
