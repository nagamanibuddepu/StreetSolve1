const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

router.post('/image', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await uploadToCloudinary(req.file.buffer, { folder: 'streetsolve/avatars' });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (err) { next(err); }
});

module.exports = router;
