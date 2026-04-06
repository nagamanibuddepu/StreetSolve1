const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Issue = require('../models/Issue');
const { protect, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

router.get('/volunteers', async (req, res, next) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;
    const query = { role: { $in: ['volunteer', 'ngo'] }, isActive: true };
    if (lat && lng) {
      query.location = { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) } };
    }
    const volunteers = await User.find(query).select('name avatar role organization skills issuesResolved volunteerRating location').limit(20);
    res.json({ success: true, data: volunteers });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp');
    if (!user) return next(new AppError('User not found', 404));
    const issues = await Issue.find({ reportedBy: user._id }).select('title status category createdAt').limit(10);
    res.json({ success: true, data: { ...user.toObject(), recentIssues: issues } });
  } catch (err) { next(err); }
});

router.put('/:id/ban', protect, authorize('admin'), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBanned: true, banReason: req.body.reason });
    res.json({ success: true, message: 'User banned.' });
  } catch (err) { next(err); }
});

module.exports = router;
