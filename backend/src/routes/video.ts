import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { startSession, endSession, joinSession, recordAction, getSession, getActiveSessionForCase, createShareLinks, getPublicSession, prisonJoin } from '../controllers/video.controller';

const router = Router();

// Public/tokenized endpoints (no auth)
router.get('/public/:token', getPublicSession);
router.post('/prison/:token/join', prisonJoin);

// Authenticated endpoints
router.use(authMiddleware);

router.post('/:caseId/start', startSession);
router.post('/session/:sessionId/join', joinSession);
router.post('/session/:sessionId/action', recordAction);
router.post('/session/:sessionId/end', endSession);
router.get('/session/:sessionId', getSession);
router.get('/:caseId/active', getActiveSessionForCase);
// Share links (protected)
router.post('/session/:sessionId/share', createShareLinks);

export default router;
