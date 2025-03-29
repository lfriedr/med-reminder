/**
 * index.js
 *
 * Entry point for Medication Reminder System backend
 * Loads env variables, mounts API routes, sets up Express server
 */
require("dotenv").config();
const express = require("express");
const callRoutes = require("./routes/call");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database to store logs
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Mount routes so server directs HTTP requests to routes/call.js
app.use("/api/call", callRoutes);

// Start Express server and listen for incoming requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});
