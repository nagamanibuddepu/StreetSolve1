/**
 * StreetSolve – Main Server Entry Point
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const logger = require("./utils/logger");
const connectDB = require("./config/database");
const { initSocketHandlers } = require("./services/socketService");
const { startCronJobs } = require("./services/cronService");
const errorHandler = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const issueRoutes = require("./routes/issues");
const voteRoutes = require("./routes/votes");
const commentRoutes = require("./routes/comments");
const volunteerRoutes = require("./routes/volunteers");
const governmentRoutes = require("./routes/government");
const notificationRoutes = require("./routes/notifications");
const aiRoutes = require("./routes/ai");
const uploadRoutes = require("./routes/upload");
const statsRoutes = require("./routes/stats");

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------

const app = express();
const server = http.createServer(app);

// Required for Render
app.set("trust proxy", 1);

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow Postman/server-to-server requests
    if (!origin) return callback(null, true);

    // Allow localhost
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow every Vercel deployment
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(null, true); // <- easiest for deployment
    // return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "Content-Type",
    "Authorization",
    "Accept",
    "x-refresh-token",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// -----------------------------------------------------------------------------
// Socket.io
// -----------------------------------------------------------------------------

const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);
initSocketHandlers(io);

// -----------------------------------------------------------------------------
// Security
// -----------------------------------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    contentSecurityPolicy: false,
  })
);

// -----------------------------------------------------------------------------
// Rate Limiter
// -----------------------------------------------------------------------------

const limiter = rateLimit({
  windowMs:
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

app.use("/api/auth", authLimiter);

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(compression());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (msg) => logger.info(msg.trim()),
      },
    })
  );
}

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StreetSolve Backend Running 🚀",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/issues", commentRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/government", governmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/stats", statsRoutes);

// -----------------------------------------------------------------------------
// Production frontend
// -----------------------------------------------------------------------------

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../../frontend/dist");

  app.use(express.static(frontendPath));

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// -----------------------------------------------------------------------------
// 404
// -----------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// -----------------------------------------------------------------------------
// Error Handler
// -----------------------------------------------------------------------------

app.use(errorHandler);

// -----------------------------------------------------------------------------
// Start Server
// -----------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info("📡 Socket.IO Ready");
      startCronJobs();
    });
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  logger.error(err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };