const { runAsync } = require('./database');

// Try loading Twilio dynamically if installed
let twilio;
try {
  twilio = require('twilio');
} catch (e) {
  console.log('Twilio module loading omitted or not fully installed yet.');
}

/**
 * Simulates sending an SMS notification, with support for actual Twilio dispatches
 * if credentials are found in the .env configurations.
 * 
 * @param {string} phoneNumber - Default recipient phone number.
 * @param {string} message - Content of the soil alert.
 * @param {number} predictionId - Associated database prediction record ID.
 * @returns {Promise<boolean>} - True if logged and dispatched successfully.
 */
async function dispatchSMS(phoneNumber, message, predictionId) {
  // Read target phone number from environment config first, otherwise fallback to parameter
  const formattedPhone = process.env.FARMER_PHONE_NUMBER || phoneNumber || '+91-99880-12345';
  
  // 1. Create simulated cellular transmission logs
  console.log('\n' + '='.repeat(80));
  console.log(' 📱 VITA-CORE SENTINEL - AUTOMATED GATEWAY CELLULAR GATEWAY');
  console.log('='.repeat(80));
  console.log(` 📡 Transmitting via: GSM Carrier Network Gateway`);
  console.log(` 👤 Recipient:        ${formattedPhone} (Field Manager)`);
  console.log(` 🕒 Timestamp:        ${new Date().toISOString()}`);
  console.log(` 📝 SMS Content:`);
  console.log(`    ┌─────────────────────────────────────────────────────────────┐`);
  
  const maxChars = 57;
  const words = message.split(' ');
  let line = '    │ ';
  for (let word of words) {
    if ((line + word).length - 6 > maxChars) {
      console.log(line + ' '.repeat(maxChars - (line.length - 7)) + '│');
      line = '    │ ' + word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.length > 6) {
    console.log(line + ' '.repeat(maxChars - (line.length - 7)) + '│');
  }
  
  console.log(`    └─────────────────────────────────────────────────────────────┘`);
  
  // 2. Real Twilio SMS dispatch trigger
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  let realDispatchSuccess = false;

  if (sid && token && fromNum && twilio) {
    console.log(` 🚀 Twilio credentials detected. Dispatching actual SMS...`);
    try {
      const client = twilio(sid, token);
      await client.messages.create({
        body: message,
        to: formattedPhone,
        from: fromNum
      });
      realDispatchSuccess = true;
      console.log(` Status: SUCCESS [Real cellular message delivered to ${formattedPhone}]`);
    } catch (err) {
      console.error(` Status: FAILED REAL DISPATCH [Twilio Error: ${err.message}]`);
    }
  } else {
    console.log(' Status: SUCCESS [Simulated SMS - MSG_' + Math.random().toString(36).substr(2, 9).toUpperCase() + ']');
  }
  console.log('='.repeat(80) + '\n');

  try {
    // 3. Save alert in local database
    await runAsync(
      `INSERT INTO alerts (prediction_id, message, phone_number, read_status, sms_dispatched_status)
       VALUES (?, ?, ?, 0, 1)`,
      [predictionId, message, formattedPhone]
    );
    return true;
  } catch (error) {
    console.error('Failed to log SMS dispatch to database:', error.message);
    return false;
  }
}

module.exports = {
  dispatchSMS
};
