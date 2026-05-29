import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/validate/:token', InterviewController.validateToken);
router.post('/resume', upload.single('resume'), InterviewController.submitResume);
router.post('/start', InterviewController.startSession);
router.post('/answer', upload.single('audio'), InterviewController.submitAnswer);
router.post('/complete/:sessionId', InterviewController.completeSession);
router.post('/terminate/:sessionId', InterviewController.terminateSession);
router.post('/anti-cheat', InterviewController.antiCheatLog);

export default router;
