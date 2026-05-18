import { Router } from 'express';
import product from '../services/product/routes/product-routes.js';
import user from '../services/users/routes/user-route.js';
import authentication from '../services/authentications/routes/authentication-routes.js';
const router = Router();
 
router.use('/api/produk', product);
router.use('/api/user', user);
router.use('/api/authentication', authentication);


export default router;
