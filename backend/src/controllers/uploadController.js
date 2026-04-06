const { AppError } = require('../middleware/errorHandler');

exports.uploadFiles = async (req, res, next) => {
  try {
    if (!req.uploadedMedia?.length) return next(new AppError('No files uploaded.', 400));
    res.json({ success: true, data: req.uploadedMedia, message: `${req.uploadedMedia.length} file(s) uploaded.` });
  } catch (err) { next(err); }
};
