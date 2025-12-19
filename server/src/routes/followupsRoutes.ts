import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { addComment, listFollowups, updateFollowup } from '../controllers/followupsController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listFollowups);
router.patch('/:id', updateFollowup);
router.post('/:id/comments', addComment);

export default router;
