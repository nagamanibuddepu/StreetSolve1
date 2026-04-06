const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.getNotifications);
router.patch('/read', protect, ctrl.markRead);
router.delete('/:id', protect, ctrl.deleteNotification);
module.exports = router;
