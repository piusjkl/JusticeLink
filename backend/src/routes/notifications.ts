import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { listMyNotifications, markNotificationRead } from '../controllers/notifications.controller';

const router = Router();
router.use(authMiddleware);
router.get('/', listMyNotifications);
router.post('/:id/read', markNotificationRead);

export default router;
