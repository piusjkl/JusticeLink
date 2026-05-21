import { Router } from 'express';
import { listTriageQueue, reviewTriage } from '../controllers/triage.controller';
import { authMiddleware, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', requireRole('admin', 'clerk', 'paralegal', 'legal_aid_officer', 'data_analyst'), listTriageQueue);
router.put('/:complaintId/review', requireRole('admin', 'paralegal', 'legal_aid_officer'), reviewTriage);

export default router;
