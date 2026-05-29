import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(['HR', 'ADMIN']));

router.post('/', CampaignController.create);
router.get('/', CampaignController.list);
router.get('/stats', CampaignController.getStats);
router.get('/all-candidates', CampaignController.listAllCandidates);
router.get('/candidate/:candidateId', CampaignController.getCandidateDetail);
router.post('/candidate/:candidateId/invite', CampaignController.invite);
router.get('/:campaignId', CampaignController.getDetails);
import { upload } from '../middlewares/upload.middleware.js';

router.post('/:campaignId/candidates', upload.single('resume'), CampaignController.addCandidate);
router.post('/:campaignId/bulk-upload', upload.array('resumes', 100), CampaignController.bulkUpload);
router.get('/:campaignId/sourcing', CampaignController.getSourcingCandidates);
router.post('/:campaignId/promote', CampaignController.promoteToInterview);
router.delete('/:campaignId/purge-broken', CampaignController.purgeBroken);
router.delete('/system/purge-all', CampaignController.purgeAll);
router.patch('/candidate/:candidateId/email', CampaignController.updateCandidateEmail);

export default router;
