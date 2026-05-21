import { Router } from 'express';
import { getCitizenHearingAccess, submitCitizenComplaint, trackCitizenComplaint } from '../controllers/citizen.controller';

const router = Router();

router.post('/complaints', submitCitizenComplaint);
router.get('/track/:trackingCode', trackCitizenComplaint);
router.get('/hearing/:trackingCode', getCitizenHearingAccess);

export default router;
