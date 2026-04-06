const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/issueController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { upload, uploadIssueImages } = require('../middleware/upload');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/', optionalAuth, ctrl.getIssues);
router.get('/nearby', ctrl.getNearbyIssues);
router.get('/:id', optionalAuth, ctrl.getIssue);
router.post('/', protect, upload.array('media', 5), uploadIssueImages, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('lat').notEmpty().withMessage('Latitude required'),
  body('lng').notEmpty().withMessage('Longitude required'),
], validate, ctrl.createIssue);
router.patch('/:id/status', protect, authorize('government', 'volunteer', 'ngo', 'admin'), ctrl.updateStatus);
router.post('/:id/vote', protect, ctrl.voteIssue);
router.post('/:id/feedback', protect, ctrl.submitFeedback);
router.post('/:id/take', protect, authorize('volunteer', 'ngo'), ctrl.takeIssue);
router.delete('/:id', protect, ctrl.deleteIssue);
router.get('/gov/:govBodyId', ctrl.getIssuesByGovBody);
module.exports = router;
