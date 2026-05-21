import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { generateReport } from '../controllers/reports.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', requireRole('admin', 'judge', 'prosecutor'), generateReport);

export default router;
