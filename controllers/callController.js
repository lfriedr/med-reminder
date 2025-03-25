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

// Function to make voice call
exports.triggerCall = async (req, res) => {
  // get phone # from request body
  const { phoneNumber } = req.body;
  // validate input
  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  // Try to Make Call:
  try {
    // init outbound call using Twilio
    const call = await client.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: "https://92e0-2603-8001-e840-886-9522-4f43-5435-e7e5.ngrok-free.app/api/call/voice", // TODO: replace
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

// Function to speak message to patient when they answer call
exports.handleVoiceCall = (req, res) => {
  // Create TwiML voice response
  const twiml = new twilio.twiml.VoiceResponse();
  // Read message aloud using Twilio's built-in TTS
  twiml.say(
    "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. " +
    "Please confirm if you have taken your Aspirin, Cardivol, and Metformin today.",
    { voice: "alice", language: "en-US" }
  );
  // Return TwiML to Twilio
  res.type("text/xml");
  res.send(twiml.toString());
};