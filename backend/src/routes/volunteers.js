const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadIssueImages } = require('../middleware/upload');

router.get('/available-issues', protect, authorize('volunteer', 'ngo'), async (req, res, next) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;
    const query = { status: { $in: ['reported', 'accepted'] }, assignedVolunteer: null };
    if (lat && lng) {
      query.location = { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) } };
    }
    const issues = await Issue.find(query).sort({ priority: -1, voteCount: -1 }).limit(30).populate('reportedBy', 'name');
    res.json({ success: true, data: issues });
  } catch (err) { next(err); }
});

router.post('/:issueId/progress', protect, authorize('volunteer', 'ngo'), upload.array('photos', 3), uploadIssueImages, async (req, res, next) => {
  try {
    const issue = await Issue.findOne({ _id: req.params.issueId, assignedVolunteer: req.user._id });
    if (!issue) return res.status(404).json({ success: false, message: 'Not found or not assigned to you' });
    if (req.uploadedMedia?.length) issue.progressMedia.push(...req.uploadedMedia);
    if (req.body.note) issue.statusHistory.push({ status: issue.status, changedBy: req.user._id, note: req.body.note });
    await issue.save();
    res.json({ success: true, data: issue });
  } catch (err) { next(err); }
});

module.exports = router;
