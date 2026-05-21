import { Router } from 'express';
import multer from 'multer';
import { env } from '../utils/env';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { addEvidence, deleteEvidence, listEvidence, downloadEvidence } from '../controllers/evidence.controller';

const router = Router();

const storage = env.DEMO_MODE ? multer.memoryStorage() : multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});

const upload = multer({ storage });

router.use(authMiddleware);
router.get('/:caseId', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listEvidence);
router.post('/:caseId', requireRole('admin', 'lawyer', 'prosecutor', 'clerk'), upload.single('file'), addEvidence);
router.delete('/:caseId/:evidenceId', requireRole('admin', 'judge'), deleteEvidence);
router.get('/file/:evidenceId', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), downloadEvidence);

export default router;
