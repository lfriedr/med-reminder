/**
 * controllers/callController.js
 *
 * Controller functions for handling voice call logic using Twilio API
 * Includes input validation, error handling, and logging
 */

// Use Twilio & load credentials
const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Controller function - inits voice call
exports.triggerCall = async (req, res) => {
  // get phone # from request body
  const { phoneNumber } = req.body;

  // validate input
  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  try {
    // init outbound call using Twilio
    const call = await client.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: "https://your-ngrok-url.ngrok.io/api/call/voice", // TODO: replace
    });
    console.log(`Call initiated. SID: ${call.sid}`);

    // respond to API caller with call SID
    res.status(200).json({ message: "Call initiated", sid: call.sid });
  } 
  catch (error) {
    console.error("Error initiating call:", error);
    res.status(500).json({ error: "Failed to initiate call" });
  }
};
