import { Router } from 'express';
import { submitCitizenComplaint, trackCitizenComplaint } from '../controllers/citizen.controller';

const router = Router();

router.post('/complaints', submitCitizenComplaint);
router.get('/track/:trackingCode', trackCitizenComplaint);

export default router;
