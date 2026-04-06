const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { upload, uploadIssueImages } = require('../middleware/upload');

// GET /api/issues/:issueId/comments
router.get('/:issueId/comments', ctrl.getComments);
// POST /api/issues/:issueId/comments
router.post('/:issueId/comments', protect, upload.array('media', 2), uploadIssueImages, ctrl.addComment);
// DELETE /api/issues/comments/:id
router.delete('/comments/:id', protect, ctrl.deleteComment);
// POST /api/issues/comments/:id/like
router.post('/comments/:id/like', protect, ctrl.likeComment);

module.exports = router;
