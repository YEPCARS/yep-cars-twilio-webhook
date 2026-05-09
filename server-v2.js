// Yep Cars — Missed Call Handler + Cartesia Lead Poller
// Handles incoming Twilio calls, captures missed calls, extracts leads from Cartesia

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const https = require('https');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_FROM = process.env.TWILIO_PHONE_FROM;
const TWILIO_PHONE_TO = process.env.TWILIO_PHONE_TO;
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !CARTESIA_API_KEY) {
  console.error('ERROR: Missing required environment variables');
  process.exit(1);
}

const twilio_client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
let lastProcessedCallTime = new Date(Date.now() - 60 * 60 * 1000); // Start 1 hour ago

// ===== INCOMING CALL HANDLER (Missed Call Capture) =====

app.post('/incoming-call', (req, res) => {
  const callerPhone = req.body.From;
  const callSid = req.body.CallSid;
  
  console.log(`[${new Date().toISOString()}] Incoming call from ${callerPhone} (SID: ${callSid})`);

  const response = new VoiceResponse();
  
  // Play message
  response.say(
    'Thanks for calling Yep Cars! We got your call. ' +
    'Text us back at 334-200-2411 or call during business hours, ' +
    'Monday through Friday, 10 AM to 6 PM.',
    { voice: 'alice' }
  );

  // Send missed call SMS
  sendMissedCallSMS(callerPhone, callSid);

  res.type('text/xml');
  res.send(response.toString());
});

// ===== MISSED CALL SMS =====

function sendMissedCallSMS(callerPhone, callSid) {
  const message = `Thanks for calling Yep Cars! We got your call. Reply here or call 334-200-2411. We're open Mon-Fri 10am-6pm. -Yep Cars`;

  twilio_client.messages.create({
    body: message,
    from: TWILIO_PHONE_FROM,
    to: callerPhone
  }).then(msg => {
    console.log(`✓ Missed call SMS sent to ${callerPhone}: ${msg.sid}`);
  }).catch(err => {
    console.error(`✗ Failed to send missed call SMS to ${callerPhone}:`, err.message);
  });
}

// ===== CARTESIA LOG POLLER (Runs every hour) =====

function pollCartesiaLogs() {
  console.log(`[${new Date().toISOString()}] Polling Cartesia for new calls...`);

  const cartesiaUrl = 'https://api.cartesia.ai/agent/calls';
  const headers = {
    'Authorization': `Bearer ${CARTESIA_API_KEY}`,
    'Content-Type': 'application/json'
  };

  https.get(
    new URL(cartesiaUrl),
    { headers },
    (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const calls = JSON.parse(data);
          processCartesiaCalls(calls.calls || []);
        } catch (err) {
          console.error('Error parsing Cartesia response:', err.message);
        }
      });
    }
  ).on('error', err => {
    console.error('Error fetching Cartesia logs:', err.message);
  });
}

function processCartesiaCalls(calls) {
  const newCalls = calls.filter(call => {
    const callTime = new Date(call.created_at);
    return callTime > lastProcessedCallTime;
  });

  if (newCalls.length === 0) {
    console.log('No new calls since last check');
    return;
  }

  console.log(`Found ${newCalls.length} new calls`);

  newCalls.forEach(call => {
    const leadInfo = extractLeadFromTranscript(call);
    
    if (leadInfo.name && leadInfo.phone) {
      sendLeadSMS(leadInfo);
    }
  });

  // Update last processed time
  if (newCalls.length > 0) {
    lastProcessedCallTime = new Date(newCalls[newCalls.length - 1].created_at);
  }
}

function extractLeadFromTranscript(call) {
  // Simple extraction from transcript
  const transcript = call.transcript || '';
  
  // Look for patterns in transcript
  const nameMatch = transcript.match(/(?:name is|my name is|i'm|this is)\s+([A-Z][a-z]+)/i);
  const phoneMatch = transcript.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
  const vehicleMatch = transcript.match(/(?:looking for|truck|car|suv|vehicle)\s+([^,]+)/i);
  const budgetMatch = transcript.match(/(?:budget|under|price|around)\s+\$?(\d+[,\d]*)/i);
  const downMatch = transcript.match(/(?:down|down payment)\s+\$?(\d+[,\d]*)/i);
  const timelineMatch = transcript.match(/(?:when|this|week|day|weekend|soon)/i);

  return {
    name: nameMatch ? nameMatch[1] : null,
    phone: phoneMatch ? phoneMatch[1] : null,
    vehicle: vehicleMatch ? vehicleMatch[1].trim() : 'Not specified',
    budget: budgetMatch ? budgetMatch[1] : null,
    down: downMatch ? downMatch[1] : null,
    timeline: timelineMatch ? timelineMatch[0] : 'Not specified',
    callSid: call.id,
    callTime: new Date(call.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  };
}

function sendLeadSMS(leadInfo) {
  const message = `🔥 LEAD from Cartesia
Name: ${leadInfo.name}
Phone: ${leadInfo.phone}
Vehicle: ${leadInfo.vehicle}
Budget: ${leadInfo.budget || 'N/A'}
Down: ${leadInfo.down || 'N/A'}
Timeline: ${leadInfo.timeline}
Time: ${leadInfo.callTime}`;

  twilio_client.messages.create({
    body: message,
    from: TWILIO_PHONE_FROM,
    to: TWILIO_PHONE_TO
  }).then(msg => {
    console.log(`✓ Lead SMS sent for ${leadInfo.name}: ${msg.sid}`);
  }).catch(err => {
    console.error(`✗ Failed to send lead SMS:`, err.message);
  });
}

// ===== ENDPOINTS =====

// Incoming call handler (Twilio → our server)
app.post('/incoming-call', (req, res) => {
  const response = new VoiceResponse();
  response.say('Thanks for calling Yep Cars! Text us at 334-200-2411 or call back Monday through Friday, 10 AM to 6 PM.', { voice: 'alice' });
  res.type('text/xml');
  res.send(response.toString());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual lead capture (from agent)
app.post('/webhook/cartesia-lead', (req, res) => {
  const { name, phone, vehicle, budget, down, timeline } = req.body;
  console.log(`Lead received: ${name}`);
  
  if (name && phone) {
    sendLeadSMS({ name, phone, vehicle: vehicle || 'Not specified', budget, down, timeline });
  }
  
  res.json({ success: true });
});

// ===== SCHEDULED TASKS =====

// Poll Cartesia every hour
setInterval(pollCartesiaLogs, 60 * 60 * 1000);
// Also run once on startup
pollCartesiaLogs();

// ===== START SERVER =====

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Yep Cars server listening on port ${PORT}`);
  console.log(`✓ Incoming calls: POST /incoming-call`);
  console.log(`✓ Health check: GET /health`);
  console.log(`✓ Cartesia poller: Running every hour`);
});
