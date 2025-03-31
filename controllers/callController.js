/**
 * controllers/callController.js
 *
 * Controller functions for handling voice call logic using Twilio API
 * Includes input validation, error handling, and logging
 */
const axios = require("axios");
const twilio = require("twilio");
const CallLog = require("../models/CallLog");
const axiosRetry = require("axios-retry").default;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const BASE_URL = process.env.RECORDING_WEBHOOK_URL;
const client = twilio(accountSid, authToken);

// Enable axios retry logic
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return error.response?.status >= 500 || error.code === 'ECONNABORTED';
  }
});

/**
 * Logic for POST /api/call
 * Initiates a voice call to a patient using the Twilio API
 * Expects a phone number in the request body
 */
exports.triggerCall = async (req, res, next) => {
  // get phone # from request body & validate
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    const err = new Error("Phone number is required");
    err.status = 400;
    next(err);
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
    // respond to API call with call SID
    res.status(200).json({ message: "Call initiated", sid: call.sid });
  } 
  catch (error) {
    console.error("Error initiating call:", error);
    next(error);
  }
};

/**
 * Logic for POST /api/call/voice 
 * Responds to Twilio's webhook when the patient answers the call.
 * Uses TTS to play a medication reminder and records the patient's response.
 */
exports.handleVoiceCall = (req, res) => {
  const { AnsweredBy } = req.body;

  // Create TwiML voice response
  const twiml = new twilio.twiml.VoiceResponse();

  // Caller Doesn't Answer: leave voicemail
  if (AnsweredBy === 'machine_end_beep' || AnsweredBy === 'machine_end_other') {
    twiml.say(
      { voice: 'alice' },
      'We called to check on your medication but couldn’t reach you. Please call us back or take your medications if you haven’t done so.'
    );
  }
  else { // Caller Answers:
    // Read message aloud using Twilio's built-in TTS
    twiml.say(
      "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today. After the beep, say yes or no.",
      { voice: "alice", language: "en-US" }
    );
    // Record patient's response after message
    twiml.record({
      timeout: 5,
      maxLength: 10,
      action: `${BASE_URL}/api/call/webhook/recording`,
      method: "POST",
      playBeep: true
    });
  }
  // Send TwiML back to Twilio
  res.type("text/xml");
  res.send(twiml.toString());
};

/**
 * Logic for POST /api/call/webhook/recording 
 * Receives recorded audio (via Twilio webhook) after patient's response is captured 
 * Sends recording to Deepgram for transcription and logs result
 */
exports.handleRecording = async (req, res) => {
  // make sure Twilio sent a recording URL
  const { RecordingUrl, CallSid } = req.body;
  if (!RecordingUrl) {
    console.error("No recording URL received.");
    return res.sendStatus(400);
  }
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
    // Send to Deepgram
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
    // Extract transcription result
    const transcript = deepgramResponse.data.results.channels[0].alternatives[0].transcript;
    console.log(`Transcription for Call SID ${CallSid}: ${transcript}`);

    // Update or create call log entry with recording + transcript
    await CallLog.findOneAndUpdate(
      { callSid: CallSid },
      {
        $set: {
          recordingUrl: RecordingUrl,
          transcription: transcript
        }
      },
      { upsert: true, new: true }
    );
    console.log(`Call log updated or created for Call SID ${CallSid}`);

    // Say bye and hang up
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
 * Logic for POST /api/call/status
 * If call not answered and voicemail rejected:
 * sends a fallback SMS reminder to the patient
 */
exports.handleCallStatus = async (req, res) => {
  const { CallSid, To, From, CallStatus, AnsweredBy, Duration } = req.body;

  console.log(`Call status: ${CallStatus}, Answered by: ${AnsweredBy}`);

 // Log call
  try {
    await CallLog.findOneAndUpdate(
      { callSid: CallSid },
      {
        $set: {
          to: To,
          from: From,
          status: CallStatus,
          answeredBy: AnsweredBy,
          duration: Duration || "0",
        }
      },
      { upsert: true, new: true }
    );
    console.log("Call log created or updated.");
  } catch (err) {
    console.error("Failed to upsert call log:", err.message);
  }

  // If voicemail rejected: send fallback SMS
  if ( CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed") {
    try {
      await client.messages.create({ 
        to: To,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: "We called to check on your medications but couldn’t reach you. Please call us back or take your medications if you haven't done so."
      });
      console.log("Fallback SMS sent.");
    } catch (err) {
      console.error("Failed to send fallback SMS:", err.message);
    }
  }
  res.sendStatus(200);
};

/**
 * Logic for POST /api/call/incoming
 * Responds to patient-initiated incoming calls
 * Replays the same TTS medication reminder message
 */
exports.handleIncomingCall = (req, res) => { 
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

/**
 * Logic for GET /api/call/logs
 * Fetches all stored call logs from the database 
 * Returns logs in reverse chronological order
 */
exports.getAllLogs = async (req, res, next) => {
  try {
    const logs = await CallLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
