const { Notification } = require('../models/index');
const { AppError } = require('../middleware/errorHandler');

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const query = { recipient: req.user._id };
    if (unread === 'true') query.read = false;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);
    res.json({ success: true, data: notifications, total, unreadCount });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (ids && ids.length) {
      await Notification.updateMany({ _id: { $in: ids }, recipient: req.user._id }, { read: true, readAt: new Date() });
    } else {
      await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true, readAt: new Date() });
    }
    res.json({ success: true, message: 'Marked as read.' });
  } catch (err) { next(err); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) { next(err); }
};
