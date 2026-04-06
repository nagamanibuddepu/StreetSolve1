/**
 * Auth Controller – Register, Login (all methods), OTP, Google OAuth
 */
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { sendTokenResponse, generateToken } = require('../middleware/auth');
const { sendEmail, sendSMS } = require('../services/notificationService');
const { GovernmentBody } = require('../models/index');
const geolib = require('geolib');
const logger = require('../utils/logger');

// ─── Helper: Find nearby gov body ────────────────────────────────────────────
const findNearbyGovBodies = async (coordinates) => {
  try {
    const [lng, lat] = coordinates;
    const bodies = await GovernmentBody.find({
      'location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50000, // 50km
        },
      },
      isActive: true,
    }).limit(5);

    const municipal = bodies.find(b => b.type === 'municipal');
    const gram = bodies.find(b => b.type === 'grampanchayat');
    return { municipal: municipal?._id, gram: gram?._id };
  } catch {
    return { municipal: null, gram: null };
  }
};

// ─── Register ────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const {
      name, email, phone, password, role,
      city, state, pincode, lat, lng, address,
      govIdType, govIdNumber, organizationName, language,
    } = req.body;

    // Validate: need at least email or phone
    if (!email && !phone) {
      return next(new AppError('Either email or phone number is required.', 400));
    }

    // Check for existing user
    const existing = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });
    if (existing) {
      return next(new AppError('User with this email or phone already exists.', 409));
    }

    const coordinates = lat && lng ? [parseFloat(lng), parseFloat(lat)] : [0, 0];
    const { municipal, gram } = await findNearbyGovBodies(coordinates);

    const userData = {
      name: name.trim(),
      email: email?.toLowerCase(),
      phone,
      password,
      role: role || 'citizen',
      language: language || 'en',
      location: {
        type: 'Point',
        coordinates,
        address,
        city,
        state,
        pincode,
      },
      nearbyMunicipalCorp: municipal,
      nearbyGramPanchayat: gram,
      isVerified: false,
    };

    if (govIdType && govIdNumber) {
      userData.governmentId = { type: govIdType, number: govIdNumber };
    }

    if (organizationName) {
      userData.organization = { name: organizationName };
    }

    const user = await User.create(userData);

    // Send OTP for verification
    const otp = user.generateOTP();
    await user.save();

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Welcome to StreetSolve – Verify Your Account',
        type: 'otp',
        data: { otp, name },
      });
    }
    if (phone) {
      await sendSMS(phone, `StreetSolve: Your OTP is ${otp}. Valid for 10 minutes.`);
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ─── Login: Email/Password ────────────────────────────────────────────────────
exports.loginEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Email and password are required.', 400));

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return next(new AppError('No account found with this email address.', 401));
    
    // Account exists but was created via Google/OTP - no password set
    if (!user.password) {
      return next(new AppError('This account uses Google login or OTP. Please use those methods instead.', 401));
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return next(new AppError('Incorrect password. Please try again.', 401));

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── Login: Request OTP ───────────────────────────────────────────────────────
exports.requestOTP = async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    if (!phone && !email) return next(new AppError('Phone or email required.', 400));

    let user = await User.findOne(phone ? { phone } : { email });

    // Auto-create for phone if not exists (seamless onboarding)
    if (!user && phone) {
      user = await User.create({
        name: 'StreetSolve User',
        phone,
        role: 'citizen',
        isVerified: false,
      });
    }

    if (!user) return next(new AppError('User not found.', 404));

    const otp = user.generateOTP();
    await user.save();

    if (phone) {
      await sendSMS(phone, `StreetSolve OTP: ${otp}. Valid 10 min. Do not share.`);
    } else if (email) {
      await sendEmail({ to: email, subject: 'StreetSolve OTP', type: 'otp', data: { otp, name: user.name } });
    }

    // In development, log OTP (REMOVE in production)
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`DEV OTP for ${phone || email}: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── Login: Verify OTP ────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, email, otp } = req.body;
    if (!otp) return next(new AppError('OTP is required.', 400));

    const user = await User.findOne(phone ? { phone } : { email }).select('+otp');
    if (!user) return next(new AppError('User not found.', 404));

    const { valid, message } = user.verifyOTP(otp);
    if (!valid) return next(new AppError(message, 400));

    user.isVerified = true;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── Login: Government ID ─────────────────────────────────────────────────────
exports.loginGovId = async (req, res, next) => {
  try {
    const { idType, idNumber, phone } = req.body;
    if (!idType || !idNumber || !phone) {
      return next(new AppError('ID type, number, and phone are required.', 400));
    }

    // Validate ID format
    const formats = {
      aadhaar: /^\d{12}$/,
      voter: /^[A-Z]{3}\d{7}$/,
      pan: /^[A-Z]{5}\d{4}[A-Z]{1}$/,
    };

    if (formats[idType] && !formats[idType].test(idNumber)) {
      return next(new AppError(`Invalid ${idType} format.`, 400));
    }

    // In production: verify with UIDAI/Election Commission API
    // For now: find user by phone and update gov ID
    let user = await User.findOne({ phone });
    if (!user) {
      return next(new AppError('No account found with this phone number.', 404));
    }

    user.governmentId = { type: idType, number: idNumber, verified: false };
    const otp = user.generateOTP();
    await user.save();

    await sendSMS(phone, `StreetSolve: Your OTP for Gov ID login is ${otp}. Valid 10 min.`);

    if (process.env.NODE_ENV === 'development') {
      logger.debug(`DEV OTP for Gov ID login: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent to registered phone.' });
  } catch (err) {
    next(err);
  }
};

// ─── Google OAuth Callback ────────────────────────────────────────────────────
exports.googleCallback = async (req, res, next) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId || !email) return next(new AppError('Google auth data incomplete.', 400));

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: { url: avatar },
        isVerified: true,
        role: 'citizen',
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.isVerified = true;
      if (!user.avatar?.url && avatar) user.avatar = { url: avatar };
      await user.save();
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── Get Me ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('nearbyMunicipalCorp', 'name type')
    .populate('nearbyGramPanchayat', 'name type');
  res.json({ success: true, data: user });
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, language, notificationPrefs, lat, lng, address, city, state, pincode } = req.body;

    const update = {};
    if (name) update.name = name;
    if (bio) update.bio = bio;
    if (language) update.language = language;
    if (notificationPrefs) update.notificationPrefs = notificationPrefs;

    if (lat && lng) {
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address, city, state, pincode,
      };
      const { municipal, gram } = await findNearbyGovBodies([parseFloat(lng), parseFloat(lat)]);
      update.nearbyMunicipalCorp = municipal;
      update.nearbyGramPanchayat = gram;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return next(new AppError('No user with that email.', 404));

    const token = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'StreetSolve – Password Reset',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Expires in 30 minutes.</p>`,
    });

    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    next(err);
  }
};
