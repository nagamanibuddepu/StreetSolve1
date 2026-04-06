/**
 * MongoDB Connection with retry logic and event handling
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  let retries = 5;
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, options);
      logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnect...');
      });

      return conn;
    } catch (err) {
      retries -= 1;
      logger.error(`MongoDB connection failed. Retries left: ${retries}`, err.message);
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
