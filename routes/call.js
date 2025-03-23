/**
 * routes/call.js
 *
 * Route for making voice calls to patients
 * Logic for this route is in a controller function - triggerCall 
 */

const express = require("express");
const router = express.Router();
const { triggerCall } = require("../controllers/callController");

/**
 * POST /api/call
 * 
 * Function triggers Twilio voice call to a patient
 * Express matches this route & runs triggerCall func from callController
 * Expects JSON body { "phoneNumber": "+1234567890" }
 */
router.post("/", triggerCall);

module.exports = router;
