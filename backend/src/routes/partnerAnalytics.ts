import { Router } from 'express';
import { getPartnerAnalytics } from '../controllers/partnerAnalytics.controller';
import { authOrPartnerToken, requireUserRoleOrPartner } from '../middlewares/partnerAuth';

const router = Router();

router.use(authOrPartnerToken);
router.get('/', requireUserRoleOrPartner('admin', 'clerk', 'partner_admin', 'data_analyst', 'legal_aid_officer'), getPartnerAnalytics);

export default router;
