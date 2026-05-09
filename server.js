// Yep Cars — Cartesia → Twilio SMS Handoff
// Receives lead data from Cartesia, sends SMS to Shannon

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.json());

// Twilio credentials (from environment variables)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_FROM = process.env.TWILIO_PHONE_FROM;
const TWILIO_PHONE_TO = process.env.TWILIO_PHONE_TO;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('ERROR: Missing Twilio environment variables');
  process.exit(1);
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Webhook endpoint: receives lead data from Cartesia
app.post('/webhook/cartesia-lead', async (req, res) => {
  try {
    const { name, phone, vehicle, budget, down, timeline, language, notes, timestamp } = req.body;

    console.log(`[${new Date().toISOString()}] Lead received: ${name || 'Unknown'}`);

    // Build SMS message
    const smsBody = buildLeadSMS({
      name,
      phone,
      vehicle,
      budget,
      down,
      timeline,
      language,
      notes,
      timestamp
    });

    // Send SMS to Shannon
    const message = await client.messages.create({
      body: smsBody,
      from: TWILIO_PHONE_FROM,
      to: TWILIO_PHONE_TO
    });

    console.log(`✓ SMS sent to ${TWILIO_PHONE_TO}: ${message.sid}`);

    // Return success
    res.json({ success: true, message_id: message.sid });
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Build formatted SMS message
function buildLeadSMS(lead) {
  const { name, phone, vehicle, budget, down, timeline, language, notes, timestamp } = lead;

  const icon = '🔥';
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const parts = [
    `${icon} LEAD via Alex ${time}`,
    `Name: ${name || 'N/A'}`,
    `Phone: ${phone || 'N/A'}`,
    `Wants: ${vehicle || 'N/A'}`,
    `Budget: ${budget || 'N/A'}`,
    `Down: ${down || 'N/A'}`,
    `Timeline: ${timeline || 'N/A'}`,
    `Lang: ${language || 'English'}`
  ];

  if (notes) {
    parts.push(`Notes: ${notes}`);
  }

  return parts.join('\n');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Yep Cars webhook server listening on port ${PORT}`);
  console.log(`✓ Health check: GET /health`);
  console.log(`✓ Lead endpoint: POST /webhook/cartesia-lead`);
});
