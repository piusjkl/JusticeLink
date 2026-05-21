import { Router } from 'express';
import { listRegistryEntries, verifyRegistry } from '../controllers/registry.controller';
import { authMiddleware, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.get('/verify', requireRole('admin', 'data_analyst', 'partner_admin'), verifyRegistry);
router.get('/', requireRole('admin', 'data_analyst', 'partner_admin'), listRegistryEntries);

export default router;
