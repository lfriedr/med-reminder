/**
 * routes/call.js
 *
 * Routes for handling voice calls to patients
 * Logic for routes is in controller functions in callController.js
 */

const express = require("express");
const router = express.Router();
const { triggerCall, handleVoiceCall } = require("../controllers/callController");

/**
 * POST /api/call
 * 
 * Function triggers Twilio voice call to a patient
 * Express matches this route & runs triggerCall func from callController
 * Expects JSON body { "phoneNumber": "+1234567890" }
 */
router.post("/", triggerCall);

/**
 * POST /api/call/voice
 * 
 * Webhook endpoint triggered by Twilio when the patient answers the call
 * Responds with TwiML medication reminder using TTS
 */
router.post("/voice", handleVoiceCall);


module.exports = router;
