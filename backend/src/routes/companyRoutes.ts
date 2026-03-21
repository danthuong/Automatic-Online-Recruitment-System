import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import * as companyController from '../controllers/companyController';

const router = Router();

router.post('/', authenticate, authorize(UserRole.HR, UserRole.ADMIN), validate(companyController.createCompanySchema), companyController.create);
router.get('/', validate(companyController.getAllSchema), companyController.getAll);
router.get('/:id', companyController.getById);
router.patch('/:id', authenticate, validate(companyController.updateCompanySchema), companyController.update);
router.patch('/:id/verify', authenticate, authorize(UserRole.ADMIN), validate(companyController.verifySchema), companyController.verify);

export default router;
