const express = require('express');
const router = express.Router();
const { GovernmentBody } = require('../models/index');
const Issue = require('../models/Issue');
const { protect, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

router.get('/', async (req, res, next) => {
  try {
    const bodies = await GovernmentBody.find({ isActive: true }).select('name type location.city location.state');
    res.json({ success: true, data: bodies });
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const body = await GovernmentBody.create(req.body);
    res.status(201).json({ success: true, data: body });
  } catch (err) { next(err); }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return next(new AppError('lat/lng required', 400));
    const bodies = await GovernmentBody.find({
      location: { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: 50000 } },
      isActive: true
    }).limit(5);
    res.json({ success: true, data: bodies });
  } catch (err) { next(err); }
});

router.get('/:id/stats', async (req, res, next) => {
  try {
    const [total, pending, resolved, byDept, byStatus] = await Promise.all([
      Issue.countDocuments({ routedTo: req.params.id }),
      Issue.countDocuments({ routedTo: req.params.id, status: { $in: ['reported', 'accepted', 'inprogress'] } }),
      Issue.countDocuments({ routedTo: req.params.id, status: { $in: ['completed', 'verified'] } }),
      Issue.aggregate([{ $match: { routedTo: require('mongoose').Types.ObjectId.createFromHexString(req.params.id) } }, { $group: { _id: '$department', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['completed', 'verified']] }, 1, 0] } } } }]),
      Issue.aggregate([{ $match: { routedTo: require('mongoose').Types.ObjectId.createFromHexString(req.params.id) } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { total, pending, resolved, byDept, byStatus } });
  } catch (err) { next(err); }
});

module.exports = router;
