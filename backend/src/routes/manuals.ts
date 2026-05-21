import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { getManual, saveManual } from '../controllers/manuals.controller';

const router = Router();
router.use(authMiddleware);
router.get('/:role', getManual);
router.post('/:role', requireRole('admin'), saveManual);

export default router;
