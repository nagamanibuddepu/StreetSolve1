const express = require('express');
const router = express.Router();
const { Vote } = require('../models/index');
const { protect } = require('../middleware/auth');

router.get('/user', protect, async (req, res, next) => {
  try {
    const votes = await Vote.find({ user: req.user._id }).select('issue').lean();
    res.json({ success: true, data: votes.map(v => v.issue) });
  } catch (err) { next(err); }
});

module.exports = router;
