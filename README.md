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

> **Get your API keys:**
>
> - Sign in to the [Twilio Console](https://www.twilio.com/console) to find your **Account SID**, **Auth Token**, and purchase a **Twilio phone number** that supports voice.
> - Create a [Deepgram account](https://console.deepgram.com/signup) to get your **API key** for transcription.


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
- Deepgram transcriptions
- Fallback SMS activity
- Any errors or warnings

Example:
```
Call initiated. SID: CAxxxxxxxxxxxxxxxxxxxxxxx
Transcription for Call SID CAxxxxxxxx: Yes, I took my medications.
```


## How It Works
```md
1. When the `/api/call` endpoint is hit, Twilio makes a call to the patient's phone.
2. If the call is answered by a human, the system speaks a medication reminder using Twilio TTS and records the response.
3. If the call goes to voicemail, the system waits for the beep and leaves a short voicemail message.
4. Once a patient response is recorded, it is transcribed using Deepgram STT.
5. If the call fails or is rejected, the system sends a fallback SMS.
6. Patients can also call back, and the system will replay the reminder and re-record their response.
```


## API Endpoints
- `POST /api/call`  
  Triggers an outgoing call to the provided phone number.
  
  **Body:**
  ```json
  {
    "phoneNumber": "+1234567890"
  }
  ```

- `POST /api/call/voice`  
  Called by Twilio when a call is answered. Responds with TTS and records patient response. Leaves voicemail if a machine answers.

- `POST /api/call/status`  
  Handles Twilio status callback and sends fallback SMS

- `POST /api/call/webhook/recording`  
  Handles recording and transcribes audio

- `POST /api/call/incoming`  
  Responds to patient-initiated calls with a reminder and recording
  
