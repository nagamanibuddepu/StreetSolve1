const express = require('express');
const router = express.Router();
const { getGlobalStats, getDashboardStats } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

router.get('/global', getGlobalStats);
router.get('/dashboard', protect, getDashboardStats);
module.exports = router;
