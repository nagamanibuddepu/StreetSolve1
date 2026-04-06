const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/classify', ctrl.classify);
router.post('/translate', protect, ctrl.translate);
router.get('/summary', protect, ctrl.aiSummary);
module.exports = router;
