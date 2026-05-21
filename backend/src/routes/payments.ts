import { Router } from 'express';
import { airtelPaymentCallback, initiateAirtelPayment, initiateMtnPayment, mtnPaymentCallback } from '../controllers/payments.controller';

const router = Router();

router.post('/mtn/initiate', initiateMtnPayment);
router.post('/mtn/callback', mtnPaymentCallback);
router.post('/airtel/initiate', initiateAirtelPayment);
router.post('/airtel/callback', airtelPaymentCallback);

export default router;
