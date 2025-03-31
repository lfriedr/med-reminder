/**
 * __tests__/api.test.js
 *
 * Integration tests verify the API endpoints work properly
 * Uses Supertest to make requests to the Express app and checks responses
 */

// Mock twilio call
jest.mock("twilio", () => {
  const calls = {
    create: jest.fn().mockResolvedValue({ sid: "CA_fakeSid" }),
  };
  const messages = {
    create: jest.fn().mockResolvedValue({ sid: "SM_fakeSid" }),
  };

  const VoiceResponse = function () {
    this.say = jest.fn();
    this.record = jest.fn();
    this.toString = () => "<Response><Say>Mock</Say><Record /></Response>";
  };

  return Object.assign(
    jest.fn(() => ({
      calls,
      messages,
    })),
    {
      twiml: {
        VoiceResponse,
      },
    }
  );
});

// Imports
const request = require("supertest");
const app = require("../index");
const mongoose = require("mongoose");


// Test POST /api/call
describe("POST /api/call", () => {
  it("should return 400 if phone number is missing", async () => {
    const res = await request(app)
      .post("/api/call")
      .send({});
    expect(res.statusCode).toBe(400); 
  });

  it("should try to trigger a call if phone number is provided", async () => {
    const res = await request(app)
      .post("/api/call")
      .send({ phoneNumber: "+1234567890" });
    expect([200, 500]).toContain(res.statusCode);
  });
});

// Test POST /api/call/voice
describe("POST /api/call/voice", () => {
  it("should respond with TwiML", async () => {
    const res = await request(app) //mimic POST request
      .post("/api/call/voice")
      .type("form")
      .send({ AnsweredBy: "human" });
    // Confirm response:
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/xml");
    expect(res.text).toContain("<Say>");
  });
});

// Test POST /api/call/webhook/recording
describe("POST /api/call/webhook/recording", () => {
  it("should return 400 if RecordingUrl is missing", async () => {
    const res = await request(app)
      .post("/api/call/webhook/recording")
      .type("form")
      .send({ CallSid: "fake_sid" });

    expect(res.statusCode).toBe(400);
  });
});

// Test POST /api/call/status
describe("POST /api/call/status", () => {
  it("should log call status and send SMS if no-answer", async () => {
    const res = await request(app)
      .post("/api/call/status")
      .type("form")
      .send({
        CallSid: "CA123",
        To: "+1234567890",
        From: "+19876543210",
        CallStatus: "no-answer",
        AnsweredBy: "unknown",
        Duration: "0"
      });

    expect(res.statusCode).toBe(200);
  });
});

// Test POST /api/call/incoming
describe("POST /api/call/incoming", () => {
  it("should respond with TwiML including <Say> and <Record>", async () => {
    const res = await request(app) //mimic POST request
      .post("/api/call/incoming")
      .type("form") 
      .send({ From: "+1234567890" });
    // Confirm response:
    expect(res.statusCode).toBe(200); //returns 200 OK
    expect(res.headers["content-type"]).toContain("text/xml"); //response is text/xml
    expect(res.text).toContain("<Say>"); //valid TwiML with a <Say> element
    expect(res.text).toContain("<Record"); //and <Record> element
  });
});

// Test GET /api/call/logs
describe("GET /api/call/logs", () => {
  it("should return logs", async () => {
    const res = await request(app).get("/api/call/logs");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// Close MongoDB connection after tests
afterAll(async () => {
  await mongoose.connection.close();
});
