import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import * as questionController from '../controllers/questionController';

const router = Router();

router.post('/', authenticate, validate(questionController.createQuestionSchema), questionController.create);
router.post('/bulk', authenticate, validate(questionController.createBulkSchema), questionController.createBulk);
router.get('/by-ids', authenticate, questionController.getByIds);
router.get('/by-tags', validate(questionController.getByTagsSchema), questionController.getByTags);
router.get('/test/:testId', questionController.getByTestId);

export default router;
