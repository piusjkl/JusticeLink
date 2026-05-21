import { Router } from 'express';
import { listReferrals, updateReferral } from '../controllers/referrals.controller';
import { authMiddleware, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', requireRole('admin', 'clerk', 'paralegal', 'legal_aid_officer', 'partner_admin', 'data_analyst'), listReferrals);
router.put('/:id', requireRole('admin', 'paralegal', 'legal_aid_officer', 'partner_admin'), updateReferral);

export default router;
