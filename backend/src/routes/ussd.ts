import { Router } from 'express';
import { handleAirtelUssd, handleMtnUssd } from '../controllers/ussd.controller';

const router = Router();

router.post('/mtn', handleMtnUssd);
router.get('/mtn', handleMtnUssd);
router.post('/airtel', handleAirtelUssd);
router.get('/airtel', handleAirtelUssd);

export default router;
