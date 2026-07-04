/**
 * Auth Controller – All auth methods with proper OTP verification
 */
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { sendTokenResponse, generateToken } = require('../middleware/auth');
const { sendEmail, sendSMS } = require('../services/notificationService');
const { GovernmentBody } = require('../models/index');
const logger = require('../utils/logger');

const findNearbyGovBodies = async (coordinates) => {
  try {
    const [lng, lat] = coordinates;
    const bodies = await GovernmentBody.find({
      location: { $near: { $geometry: { type:'Point', coordinates:[lng,lat] }, $maxDistance:100000 } },
      isActive: true,
    }).limit(5);
    return { municipal: bodies.find(b=>b.type==='municipal')?._id, gram: bodies.find(b=>b.type==='grampanchayat')?._id };
  } catch { return { municipal:null, gram:null }; }
};

// ─── Register ────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, city, state, pincode, lat, lng, address, organizationName, language } = req.body;
    if (!email && !phone) return next(new AppError('Email or phone required.', 400));
    if (!name?.trim()) return next(new AppError('Name is required.', 400));

    const existing = await User.findOne({ $or: [...(email?[{email}]:[]), ...(phone?[{phone}]:[]) ] });
    if (existing) return next(new AppError('Account with this email/phone already exists.', 409));

    const coordinates = lat && lng ? [parseFloat(lng), parseFloat(lat)] : [0,0];
    const { municipal, gram } = await findNearbyGovBodies(coordinates);

    const user = await User.create({
      name: name.trim(), email: email?.toLowerCase()?.trim(), phone, password,
      role: role || 'citizen', language: language || 'en',
      location: { type:'Point', coordinates, address, city, state, pincode },
      nearbyMunicipalCorp: municipal, nearbyGramPanchayat: gram,
      isVerified: false,
      ...(organizationName ? { organization: { name: organizationName } } : {}),
    });

    // Send welcome email (non-blocking)
    if (email) {
      sendEmail({ to: email, subject: 'Welcome to StreetSolve!', type: 'welcome', data: { name: user.name } }).catch(()=>{});
    }

    sendTokenResponse(user, 201, res);
  } catch(err){ next(err); }
};

// ─── Email + Password Login ───────────────────────────────────────────────────
exports.loginEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Email and password required.', 400));
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +otp');
    if (!user) return next(new AppError('No account found with this email.', 401));
    // Google-only accounts: offer to set password
    if (!user.password) {
      return next(new AppError('This account was created with Google Sign-In. Please use Google login, or request an OTP to set a password.', 401));
    }
    if (!await user.matchPassword(password)) return next(new AppError('Incorrect password.', 401));
    user.lastSeen = new Date();
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch(err){ next(err); }
};

// ─── Request OTP ──────────────────────────────────────────────────────────────
exports.requestOTP = async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    if (!phone && !email) return next(new AppError('Phone or email required.', 400));

    let user = await User.findOne(phone ? { phone } : { email }).select('+otp');
    if (!user) {
      // Auto-create minimal account for OTP login
      user = await User.create({
        name: phone || email.split('@')[0],
        phone: phone || undefined,
        email: email?.toLowerCase() || undefined,
        role: 'citizen', isVerified: false,
      });
    }

    const otp = user.generateOTP();
    await user.save();

    // Always log OTP in dev
    logger.info(`OTP for ${phone||email}: ${otp}`);

    let sent = false;
    if (phone) {
      sent = await sendSMS(phone, `StreetSolve OTP: ${otp}. Valid 10 min. Do NOT share.`);
    }
    if (email && !sent) {
      await sendEmail({ to: email, subject: 'StreetSolve OTP', type: 'otp', data: { otp, name: user.name } });
    }

    res.json({ success:true, message:`OTP sent to ${phone||email}.`, ...(process.env.NODE_ENV==='development' ? { devOtp: otp } : {}) });
  } catch(err){ next(err); }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, email, otp } = req.body;
    if (!otp) return next(new AppError('OTP is required.', 400));
    if (!phone && !email) return next(new AppError('Phone or email required.', 400));

    const user = await User.findOne(phone ? { phone } : { email }).select('+otp +password');
    if (!user) return next(new AppError('Account not found.', 404));

    const { valid, message } = user.verifyOTP(otp.toString().trim());
    if (!valid) return next(new AppError(message || 'Invalid or expired OTP.', 400));

    user.isVerified = true;
    user.lastSeen = new Date();
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch(err){ next(err); }
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────
exports.googleCallback = async (req, res, next) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId || !email) return next(new AppError('Google auth data incomplete.', 400));

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({ name, email: email.toLowerCase(), googleId, avatar: avatar?{url:avatar}:undefined, role:'citizen', isVerified:true });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatar?.url && avatar) user.avatar = { url: avatar };
      user.isVerified = true;
    }
    user.lastSeen = new Date();
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch(err){ next(err); }
};

// ─── Get Me ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success:true, data:user });
  } catch(err){ next(err); }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name','bio','language','notificationPrefs','location','aadhaarNumber','currentAddress','volunteerVerified','aadhaarVerified','fcmToken'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new:true, runValidators:true });
    res.json({ success:true, data:user });
  } catch(err){ next(err); }
};

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return next(new AppError('New password must be at least 8 characters.', 400));
    const user = await User.findById(req.user._id).select('+password');
    if (user.password && currentPassword) {
      if (!await user.matchPassword(currentPassword)) return next(new AppError('Current password incorrect.', 401));
    }
    user.password = newPassword;
    await user.save();
    res.json({ success:true, message:'Password updated.' });
  } catch(err){ next(err); }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  res.cookie('token','none',{ expires:new Date(Date.now()+1000), httpOnly:true });
  res.json({ success:true, message:'Logged out.' });
};

exports.forgotPassword = async (req,res,next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return next(new AppError('No account with this email.', 404));
    const token = user.generatePasswordResetToken();
    await user.save();
    const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendEmail({ to: user.email, subject:'Reset StreetSolve Password', html:`<p>Reset: <a href="${url}">${url}</a>. Expires in 30 min.</p>` });
    res.json({ success:true, message:'Password reset email sent.' });
  } catch(err){ next(err); }
};

//optional - gen by gpt
// ─── Login with Government ID ────────────────────────────────────────────────
exports.loginGovId = async (req, res, next) => {
  try {
    const { govId } = req.body;
    if (!govId) return next(new AppError('Government ID is required.', 400));

    // Find user by govId
    const user = await User.findOne({ govId }).select('+password +otp');
    if (!user) return next(new AppError('No account found with this Government ID.', 401));

    // Optional: Only allow users with role 'government'
    if (user.role !== 'government') return next(new AppError('Access denied. Not a government user.', 403));

    user.lastSeen = new Date();
    await user.save();

    sendTokenResponse(user, 200, res); // Issue JWT token like other login methods
  } catch (err) {
    next(err);
  }
};