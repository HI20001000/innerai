import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createMeeting, getMeeting, listMeetings } from '../controllers/meetingsController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listMeetings);
router.post('/', createMeeting);
router.get('/:id', getMeeting);

export default router;
