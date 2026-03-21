import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import {
  getAllSchema,
  updateSchema,
  deleteSchema,
  getAll,
  getById,
  update,
  remove,
  getMyCandidateProfile,
} from '../controllers/userController';

const router = Router();

router.use(authenticate);

router.get('/', authorize(UserRole.ADMIN, UserRole.HR), validate(getAllSchema), getAll);
router.get('/me', getById);
router.get('/me/candidate-profile', getMyCandidateProfile);
router.get('/:id', authorize(UserRole.ADMIN, UserRole.HR), getById);
router.patch('/:id', validate(updateSchema), update);
router.delete('/:id', authorize(UserRole.ADMIN), validate(deleteSchema), remove);

export default router;
