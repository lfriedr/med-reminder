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

// Mount routes so server knows where to direct HTTP requests
app.use("/api/call", callRoutes);

// Start Express server and listen for incoming requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});