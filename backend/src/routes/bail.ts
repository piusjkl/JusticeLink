import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { createBail, listBailForCase, decideBail } from '../controllers/bail.controller';

const router = Router();
router.use(authMiddleware);

router.post('/', createBail);
router.get('/:caseId', listBailForCase);
router.post('/decision/:id', decideBail);

export default router;
