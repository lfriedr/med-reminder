# Medication Reminder System

A voice-driven medication reminder system built with Node.js, Twilio, and Deepgram. This project allows you to trigger automated phone calls to patients, speak a reminder using text-to-speech (TTS), record their response, and transcribe it using speech-to-text (STT).


## Features

- Trigger outgoing reminder calls via API
- Play a message using Twilio TTS
- Record patient responses
- Transcribe responses using Deepgram
- Log call outcomes and transcriptions
- Handle incoming patient-initiated calls
- Send fallback SMS if the call is not answered


## Setup Instructions

### 1. Clone the repository

```
git clone https://github.com/lfriedr/medication-reminder.git
cd medication-reminder
```

### 2. Install dependencies

```
npm install
```

### 3. Create a `.env` file

```
touch .env
```

Add the following environment variables:

```
PORT=3000
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
DEEPGRAM_API_KEY=your_deepgram_api_key
RECORDING_WEBHOOK_URL=https://your-ngrok-subdomain.ngrok-free.app
```


## How to Run Locally

```
node index.js
```

Or, with automatic reload:

```
npx nodemon index.js
```


## Expose Your Local Server with Ngrok

In a second terminal, run:

```
npx ngrok http 3000
```

Copy the generated HTTPS link and update your `.env` file's `RECORDING_WEBHOOK_URL`.


## Configure Twilio Webhooks

In the Twilio Console, go to your phone number settings and set:

- **Voice > A Call Comes In**  
  URL: `POST https://your-ngrok-subdomain.ngrok-free.app/api/call/incoming`


## Sample API Call to Trigger Reminder

### Endpoint:
`POST /api/call`

### URL:
`http://localhost:3000/api/call`

### Headers:
`Content-Type: application/json`

### Request Body:
```
{
  "phoneNumber": "+1234567890"
}
```

You can use Postman or curl to send this request.


## How to Inspect Console Logs

While your server is running, logs will display:

- When calls are triggered
- Incoming Twilio webhook requests
- Deepgram transcriptions
- Fallback SMS activity
- Any errors or warnings

Example:
```
Call initiated. SID: CAxxxxxxxxxxxxxxxxxxxxxxx
Incoming recording webhook...
Transcription for Call SID CAxxxxxxxx: Yes, I took my medications.
```


## Additional Endpoints

- `POST /api/call/status`  
  Handles Twilio status callback and sends fallback SMS

- `POST /api/call/webhook/recording`  
  Handles recording and transcribes audio

- `POST /api/call/incoming`  
  Responds to patient-initiated calls with a reminder and recording

- `GET /api/call/logs`  
  Returns stored call logs if connected to a database