import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import * as testController from '../controllers/testController';

const router = Router();

router.post('/', authenticate, authorize(UserRole.HR, UserRole.ADMIN), validate(testController.createTestSchema), testController.create);
router.get('/my-tests', authenticate, testController.getByCandidate);
router.get('/application/:applicationId', authenticate, testController.getByApplication);
router.get('/:id', authenticate, testController.getById);
router.get('/testId/:testId', testController.getByTestId);
router.post('/:testId/start', authenticate, testController.start);
router.post('/:testId/submit', authenticate, authorize(UserRole.CANDIDATE), validate(testController.submitTestSchema), testController.submit);

export default router;
