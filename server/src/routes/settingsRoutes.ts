import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import {
  createCustomer,
  createManufacturer,
  createProduct,
  deleteCustomer,
  deleteManufacturer,
  deleteProduct,
  listCustomers,
  listManufacturers,
  listProducts,
  updateCustomer,
  updateManufacturer,
  updateProduct,
} from '../controllers/settingsController.js';

const router = Router();
router.use(requireAuth);

router.get('/customers', listCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

router.get('/manufacturers', listManufacturers);
router.post('/manufacturers', createManufacturer);
router.put('/manufacturers/:id', updateManufacturer);
router.delete('/manufacturers/:id', deleteManufacturer);

router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;
