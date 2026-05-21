import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { createUser, deleteUser, getUser, listUsers, updateMe, updateUser, getMe } from '../controllers/users.controller';

const router = Router();

router.use(authMiddleware);
router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/', requireRole('admin', 'clerk'), listUsers);
router.get('/:id', requireRole('admin'), getUser);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;
