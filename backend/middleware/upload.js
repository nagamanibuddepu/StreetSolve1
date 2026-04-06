/**
 * File Upload Middleware – Cloudinary with validation
 */
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { AppError } = require('./errorHandler');
const sharp = require('sharp');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage for processing before upload
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} not supported. Allowed: JPEG, PNG, WebP, MP3, WAV`, 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
});

// Upload to Cloudinary with compression
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  const {
    folder = 'streetsolve/issues',
    resourceType = 'image',
    transformation = [],
  } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation: resourceType === 'image' ? [
          { width: 1200, height: 900, crop: 'limit', quality: 'auto:good' },
          ...transformation,
        ] : [],
        eager_async: false,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Process and optimize image before upload
const processImage = async (buffer) => {
  return sharp(buffer)
    .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
};

// Middleware to upload multiple issue images
const uploadIssueImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    const uploadedMedia = [];
    for (const file of req.files) {
      let buffer = file.buffer;

      // Compress images
      if (file.mimetype.startsWith('image/')) {
        buffer = await processImage(buffer);
      }

      const result = await uploadToCloudinary(buffer, {
        folder: 'streetsolve/issues',
        resourceType: file.mimetype.startsWith('audio/') ? 'video' : 'image',
      });

      uploadedMedia.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: file.mimetype.startsWith('audio/') ? 'audio' : 'image',
      });
    }
    req.uploadedMedia = uploadedMedia;
    next();
  } catch (err) {
    next(new AppError('Image upload failed: ' + err.message, 500));
  }
};

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete from Cloudinary:', err);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadIssueImages,
  deleteFromCloudinary,
};
