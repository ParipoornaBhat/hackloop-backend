const express = require("express");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const Notification = require("./models/notification");
const User = require("./models/user");
const MongoStore = require("connect-mongo");
const createHttpError = require("http-errors");
const ConnectFlash = require("connect-flash");

dotenv.config(); // Load environment variables

// Ensure VAPID keys are set correctly
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("VAPID keys are not set. Please ensure your .env file contains VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
}

webpush.setVapidDetails(
  "mailto:example@yourdomain.com", // Replace with your email
  VAPID_PUBLIC_KEY, // Your public key from .env
  VAPID_PRIVATE_KEY // Your private key from .env
);

const app = express();
const server = app.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});

// Enable CORS for your frontend
const corsOptions = {
  origin: process.env.API_URL, // Allow your frontend to make requests (dynamically from .env)
  methods: ["GET", "POST"], // Allow GET and POST requests
  allowedHeaders: ["Content-Type"], // Allow content-type header
};

app.use(cors(corsOptions)); // Apply CORS middleware

// Setup socket.io with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.API_URL, // Allow socket.io connection from your frontend (dynamically from .env)
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(ConnectFlash());

// Database connection
require("./config/db");

// Mock of user subscriptions (You should store this in the DB)
let userSubscriptions = {};

// Fetch all unseen notifications for the user
app.get("/api/notifications", async (req, res) => {
  const userId = req.query.userId;
  const notifications = await Notification.find({ user: userId, seen: false });
  res.json(notifications);
});

// Store subscription in the backend when the user grants notification permission
app.post("/api/subscribe", (req, res) => {
  const { subscription, userId } = req.body;

  // Save the subscription in the userSubscriptions object or DB
  userSubscriptions[userId] = subscription;
  res.status(201).json({ message: "Subscribed for notifications." });
});

// Send notifications to the client
const sendNotification = async (subscription, notification) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(notification));
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Watch for new notifications and send them to subscribers
Notification.watch().on("change", async (change) => {
  if (change.operationType === "insert") {
    const newNotification = change.fullDocument;

    // Notify all users who are subscribed
    for (const userId in userSubscriptions) {
      const subscription = userSubscriptions[userId];

      // Create a notification payload
      const notification = {
        title: "New Notification",
        message: newNotification.message,
      };

      sendNotification(subscription, notification);
    }

    // Emit to the frontend using Socket.io for real-time updates
    io.emit("new-notification", newNotification);
  }
});

// Socket.io connection for real-time updates
io.on("connection", (socket) => {
  console.log("User connected");

  // Listen for user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Routes
app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/user", require("./routes/admin.route"));
app.use("/api/user", require("./routes/apply.route"));
app.use("/api/user", require("./routes/notify.route"));
app.use("/api", require("./routes/doctor.route"));
app.use("/api", require("./routes/appointment.route"));

app.post("/api/subscribe", async (req, res) => {
  const { subscription, userId } = req.body;
  // Store the subscription in the database for the user
  try {
    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    res.status(201).json({ message: "Subscription saved!" });
  } catch (error) {
    res.status(500).json({ error: "Error saving subscription." });
  }
});

// Example of a basic GET route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Error handling middleware
app.use((req, res, next) => {
  next(createHttpError(404, "Not Found"));
});
