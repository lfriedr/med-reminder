const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema({
  callSid: String,
  to: String,
  from: String,
  status: String,
  answeredBy: String,
  duration: String,
  recordingUrl: String,
  transcription: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("CallLog", callLogSchema);
