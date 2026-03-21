import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import * as jobController from '../controllers/jobController';

const router = Router();

router.post('/', authenticate, authorize(UserRole.HR, UserRole.ADMIN), validate(jobController.createJobSchema), jobController.create);
router.get('/', validate(jobController.getAllSchema), jobController.getAll);
router.get('/company/:companyId', validate(jobController.getAllSchema), jobController.getByCompany);
router.get('/:id', jobController.getById);
router.patch('/:id', authenticate, validate(jobController.updateJobSchema), jobController.update);
router.patch('/:id/status', authenticate, authorize(UserRole.HR, UserRole.ADMIN), jobController.updateStatus);

export default router;
