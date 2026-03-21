import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import * as applicationController from '../controllers/applicationController';

const router = Router();

router.post('/', authenticate, authorize(UserRole.CANDIDATE), validate(applicationController.createApplicationSchema), applicationController.create);
router.get('/my-applications', authenticate, validate(applicationController.getAllByCandidateSchema), applicationController.getByCandidate);
router.get('/job/:jobId', authenticate, authorize(UserRole.HR, UserRole.ADMIN), validate(applicationController.getAllByJobSchema), applicationController.getByJob);
router.get('/:id', authenticate, applicationController.getById);
router.patch('/:id/status', authenticate, authorize(UserRole.HR, UserRole.ADMIN), validate(applicationController.updateStatusSchema), applicationController.updateStatus);
router.post('/:id/screen', authenticate, authorize(UserRole.HR, UserRole.ADMIN), validate(applicationController.screenSchema), applicationController.screen);

export default router;
