import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { createCase, createCaseFromComplaint, deleteCase, getCase, listCases, updateCase, listPleadings, addPleading, listParticipants, addParticipant, listCharges, addCharge, listRelatedCases, addRelatedCase } from '../controllers/cases.controller';
import { listTimeline, addTimeline } from '../controllers/timeline.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listCases);
router.get('/:id', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), getCase);
router.get('/:id/timeline', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listTimeline);
router.post('/:id/timeline', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), addTimeline);
// New endpoints for pleadings, participants, charges, related cases
router.get('/:id/pleadings', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listPleadings);
router.post('/:id/pleadings', requireRole('admin', 'clerk', 'lawyer'), addPleading);
router.get('/:id/participants', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listParticipants);
router.post('/:id/participants', requireRole('admin', 'clerk', 'lawyer'), addParticipant);
router.get('/:id/charges', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listCharges);
router.post('/:id/charges', requireRole('admin', 'clerk', 'prosecutor'), addCharge);
router.get('/:id/related', requireRole('admin', 'judge', 'lawyer', 'clerk', 'prosecutor'), listRelatedCases);
router.post('/:id/related', requireRole('admin', 'clerk', 'lawyer'), addRelatedCase);
router.post('/from-complaint/:complaintId', requireRole('admin', 'clerk'), createCaseFromComplaint);
router.post('/', requireRole('admin', 'clerk'), createCase);
router.put('/:id', requireRole('admin', 'clerk', 'judge'), updateCase);
router.delete('/:id', requireRole('admin'), deleteCase);

export default router;
