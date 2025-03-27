/**
 * controllers/callController.js
 *
 * Controller functions for handling voice call logic using Twilio API
 * Includes input validation, error handling, and logging
 */

const axios = require("axios");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const BASE_URL = process.env.RECORDING_WEBHOOK_URL;

/**
 * Initiates a voice call to a patient using the Twilio API
 * Expects a phone number in the request body
 */
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
      url: `${BASE_URL}/api/call/voice`,
      statusCallback: `${BASE_URL}/api/call/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["completed"],
      machineDetection: 'DetectMessageEnd',
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

/**
 * Responds to Twilio's webhook when the patient answers the call.
 * Uses TTS to play a medication reminder and records the patient's response.
 */
exports.handleVoiceCall = (req, res) => {
  // Create TwiML voice response
  const twiml = new twilio.twiml.VoiceResponse();

  // Read message aloud using Twilio's built-in TTS
  twiml.say(
    "Hello, this is a reminder from your healthcare provider. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today. After the beep, say yes or no.",
    // "After the beep, say yes or no.", //TESTING
    { voice: "alice", language: "en-US" }
  );
  // Record patient's response after message
  twiml.record({
    timeout: 5,
    maxLength: 10, //10 sec response 
    action: `${BASE_URL}/api/call/webhook/recording`,
    method: "POST",
    playBeep: true
  });

  // Send TwiML back to Twilio
  res.type("text/xml");
  res.send(twiml.toString());
};


/**
 * Receives recorded audio (via Twilio webhook) after patient's response is captured 
 * Sends recording to Deepgram for transcription and logs result
 */
exports.handleRecording = async (req, res) => {
  // console.log("Incoming recording webhook:", req.body); //TESTING

  // make sure Twilio sent a recording URL
  const { RecordingUrl, CallSid } = req.body;
  if (!RecordingUrl) {
    console.error("No recording URL received.");
    return res.sendStatus(400);
  }
  // console.log("RecordingUrl: ", RecordingUrl); //TESTING

  // Download & send recording to Deepgram for transcription
  try {
    // Give Twilio time to finalize recording file
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Download recording from Twilio using basic auth
    const twilioResponse = await axios.get(RecordingUrl, {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      },
      responseType: "arraybuffer"
    });
    console.log("Success downloading from Twilio");

    // Send audio buffer to Deepgram
    const deepgramResponse = await axios.post(
      "https://api.deepgram.com/v1/listen",
      twilioResponse.data,
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": twilioResponse.headers["content-type"] || "audio/wav"
        }
      }
    );

    // extract transcription result
    const transcript = deepgramResponse.data.results.channels[0].alternatives[0].transcript;
    console.log(`Transcription for Call SID ${CallSid}: ${transcript}`);

    // say bye and hang up
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Thank you. Goodbye.");
    res.type("text/xml");
    res.send(twiml.toString());
  } 
  catch (error) {
    console.error("Error handling recording:", error.message);
    res.sendStatus(500);
  }
};

/**
 * If call not answered and voicemail rejected:
 * sends a fallback SMS reminder to the patient
 */
exports.handleCallStatus = async (req, res) => {
  const { CallStatus, To } = req.body;
  console.log("Call Status:", CallStatus);

  // If voicemail rejected: send fallback SMS
  if ( CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed") {
    try {
      await client.messages.create({ // NEED TO TEST
        to: To,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: "We tried to call you to confirm your medications, but couldn’t reach you. Please call us back or take your medications if you haven't yet."
      });
      console.log("Fallback SMS sent.");
    } catch (err) {
      console.error("Failed to send fallback SMS:", err.message);
    }
  }
  res.sendStatus(200);
};

/**
 * Responds to patient-initiated incoming calls
 * Replays the same TTS medication reminder message
 */
exports.handleIncomingCall = (req, res) => { // NEED TO TEST
  console.log("Incoming call from:", req.body.From);

  // Speak the medication reminder
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(
    "Hello, this is a reminder from your healthcare provider. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today. After the beep, say yes or no.",
    { voice: "alice", language: "en-US" }
  );
  // Record spoken response
  twiml.record({
    timeout: 5,
    maxLength: 10,
    action: `${BASE_URL}/api/call/webhook/recording`,
    method: "POST",
    playBeep: true
  });
  res.type("text/xml");
  res.send(twiml.toString());
};