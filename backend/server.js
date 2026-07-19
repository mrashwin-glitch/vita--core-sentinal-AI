require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { 
  initializeDb, 
  runAsync, 
  allAsync, 
  getAsync 
} = require('./database');
const { runAIAnalysis } = require('./ai_bridge');
const { dispatchSMS } = require('./sms_simulator');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'vitacore_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Multer Config for Ingestion Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const result = await runAsync(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'farmer']
    );
    
    const token = jwt.sign({ id: result.lastID, name, email, role: 'farmer' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: result.lastID, name, email, role: 'farmer' } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    const user = await getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. ANALYTICS & IMAGE INGESTION ENDPOINTS
// ==========================================

app.get('/api/analytics/calibration/:fieldId', async (req, res) => {
  const fieldId = parseInt(req.params.fieldId) || 1;
  try {
    const calibration = await getAsync('SELECT * FROM sensor_calibration WHERE field_id = ?', [fieldId]);
    if (!calibration) {
      return res.json({
        field_id: fieldId,
        species_id: 'mycena_chlorophos',
        gain: 1.2,
        cutoff: 15.0,
        model_type: 'sigmoidal',
        ambient_lux: 3.0,
        mycelium_age: 10
      });
    }
    res.json(calibration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analytics/calibrate', async (req, res) => {
  const { fieldId, speciesId, gain, cutoff, modelType, ambientLux, myceliumAge } = req.body;
  if (!fieldId) {
    return res.status(400).json({ error: 'fieldId is required' });
  }

  try {
    const field = await getAsync('SELECT id FROM field_data WHERE id = ?', [fieldId]);
    if (!field) {
      return res.status(404).json({ error: 'Field sector not found' });
    }

    await runAsync(
      `INSERT INTO sensor_calibration (field_id, species_id, gain, cutoff, model_type, ambient_lux, mycelium_age, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(field_id) DO UPDATE SET
         species_id = excluded.species_id,
         gain = excluded.gain,
         cutoff = excluded.cutoff,
         model_type = excluded.model_type,
         ambient_lux = excluded.ambient_lux,
         mycelium_age = excluded.mycelium_age,
         updated_at = CURRENT_TIMESTAMP`,
      [fieldId, speciesId || 'mycena_chlorophos', gain || 1.2, cutoff || 15.0, modelType || 'sigmoidal', ambientLux || 3.0, myceliumAge || 10]
    );

    res.json({ success: true, message: 'Sensor calibration updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analytics/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  
  const fieldId = parseInt(req.body.fieldId) || 1;
  const imagePath = req.file.path;
  const imageName = req.file.filename;
  
  try {
    // 1. Fetch field data and its calibration parameters
    const field = await getAsync('SELECT * FROM field_data WHERE id = ?', [fieldId]);
    if (!field) {
      return res.status(404).json({ error: 'Field sector not found' });
    }
    
    let calibration = await getAsync('SELECT * FROM sensor_calibration WHERE field_id = ?', [fieldId]);
    if (!calibration) {
      calibration = { gain: 1.2, cutoff: 15.0, ambient_lux: 3.0, mycelium_age: 10 };
    }
    
    // 2. Run Python CNN image analyzer with calibration parameters
    const aiResult = await runAIAnalysis(imagePath, req.file.originalname, calibration);
    
    if (!aiResult.success) {
      return res.status(500).json({ error: 'AI analysis failed', details: aiResult.error });
    }
    
    const { nitrogen, moisture, ph, stress_level, validation } = aiResult;
    const valStatus = (validation && validation.status) ? validation.status : 'passed';
    const valReason = (validation && validation.reason) ? validation.reason : 'Sensor returns are within normal operational limits.';
    const valCode = (validation && validation.code) ? validation.code : 'SENSOR_OK';
    
    // Random offset points for visualization inside the sector bounds
    const coords = {
      x: Math.floor(Math.random() * 40) + 30, // Percentage coordinates for dashboard Canvas mapping
      y: Math.floor(Math.random() * 40) + 30
    };
    
    // 3. Save prediction to DB (including validation diagnostics)
    const insertResult = await runAsync(
      `INSERT INTO predictions (field_id, image_name, nitrogen_val, moisture_val, ph_val, stress_level, coordinates, ambient_lux, mycelium_age, validation_status, validation_reason, validation_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fieldId, imageName, nitrogen, moisture, ph, stress_level, JSON.stringify(coords), calibration.ambient_lux, calibration.mycelium_age, valStatus, valReason, valCode]
    );
    
    const predictionId = insertResult.lastID;
    
    // 4. Trigger automated SMS log if stress is high (and sensor is NOT failed due to quenching)
    let smsDispatched = false;
    if (stress_level === 'high' && valCode !== 'SENSOR_QUENCHED' && valStatus !== 'failed') {
      let alertMessage = `VITA-CORE SENTINEL ALERT: High stress detected in ${field.name}. `;
      const issues = [];
      if (moisture < 30) issues.push(`Critical Moisture Drop (${moisture}%)`);
      if (nitrogen < 70) issues.push(`Severe Nitrogen Depletion (${nitrogen} mg/kg)`);
      if (ph < 5.5) issues.push(`Highly Acidic Soil (pH ${ph})`);
      if (ph > 8.0) issues.push(`Highly Alkaline Soil (pH ${ph})`);
      
      alertMessage += issues.join(' & ') + `. Immediate corrective irrigation/fertilization recommended.`;
      
      smsDispatched = await dispatchSMS('+91-99880-12345', alertMessage, predictionId);
    } else if (valCode === 'SENSOR_QUENCHED') {
      let alertMessage = `VITA-CORE TOXICITY WARNING: Complete biosensor quenching detected in ${field.name}. Soil toxicity or contamination suspected. Suspension of standard fertilization required.`;
      smsDispatched = await dispatchSMS('+91-99880-12345', alertMessage, predictionId);
    }
    
    res.json({
      success: true,
      predictionId,
      metrics: { nitrogen, moisture, ph, stress_level },
      validation: {
        status: valStatus,
        reason: valReason,
        code: valCode,
        snr_db: validation ? validation.snr_db : 15.0,
        glow_percentage: validation ? validation.glow_percentage : 15.0
      },
      smsDispatched,
      image_url: `/uploads/${imageName}`
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/history', async (req, res) => {
  try {
    const history = await allAsync(`
      SELECT p.id, p.field_id, f.name as field_name, f.crop_type, p.nitrogen_val, p.moisture_val, p.ph_val, p.stress_level, p.created_at
      FROM predictions p
      JOIN field_data f ON p.field_id = f.id
      ORDER BY p.created_at ASC
    `);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/heatmap', async (req, res) => {
  try {
    // Returns the latest metrics for each field sector
    const sectors = await allAsync(`
      SELECT f.id, f.name, f.area_acres, f.crop_type, f.coordinate_bounds, p.nitrogen_val, p.moisture_val, p.ph_val, p.stress_level, p.created_at
      FROM field_data f
      LEFT JOIN predictions p ON p.id = (
        SELECT id FROM predictions WHERE field_id = f.id ORDER BY created_at DESC LIMIT 1
      )
    `);
    res.json(sectors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ALERTS & SMS LOGS ENDPOINTS
// ==========================================

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await allAsync(`
      SELECT a.id, a.prediction_id, a.message, a.phone_number, a.read_status, a.sms_dispatched_status, a.created_at, p.field_id
      FROM alerts a
      JOIN predictions p ON a.prediction_id = p.id
      ORDER BY a.created_at DESC
    `);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts/read', async (req, res) => {
  try {
    await runAsync('UPDATE alerts SET read_status = 1');
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. RAG-ENABLED AI AGRONOMY REPORT ADVISOR
// ==========================================

app.post('/api/agronomy/remediate', async (req, res) => {
  const { fieldId } = req.body;
  if (!fieldId) {
    return res.status(400).json({ error: 'fieldId is required' });
  }

  try {
    const field = await getAsync('SELECT * FROM field_data WHERE id = ?', [fieldId]);
    if (!field) {
      return res.status(404).json({ error: 'Field sector not found' });
    }

    const guidelinesPath = path.join(__dirname, 'crop_guidelines.json');
    const guidelines = JSON.parse(fs.readFileSync(guidelinesPath, 'utf8'));
    const cropInfo = guidelines.crops[field.crop_type];
    
    if (!cropInfo) {
      return res.status(400).json({ error: `No reference guidelines found for crop: ${field.crop_type}` });
    }

    // Reset soil parameters to optimal midpoints
    const targetNitrogen = Math.round(((cropInfo.optimal_nitrogen_mg_kg.min + cropInfo.optimal_nitrogen_mg_kg.max) / 2) * 10) / 10;
    const targetMoisture = Math.round(((cropInfo.optimal_moisture_percent.min + cropInfo.optimal_moisture_percent.max) / 2) * 10) / 10;
    const targetPh = Math.round(((cropInfo.optimal_ph.min + cropInfo.optimal_ph.max) / 2) * 10) / 10;
    const stressLevel = 'low';

    // Get coordinates from last prediction if available, else use a random layout coordinate
    const lastPrediction = await getAsync(
      'SELECT coordinates FROM predictions WHERE field_id = ? ORDER BY created_at DESC LIMIT 1',
      [fieldId]
    );
    let coords = { x: 50, y: 50 };
    if (lastPrediction && lastPrediction.coordinates) {
      try {
        coords = JSON.parse(lastPrediction.coordinates);
      } catch (e) {}
    }

    // Insert new prediction indicating a healthy soil state
    const insertResult = await runAsync(
      `INSERT INTO predictions (field_id, image_name, nitrogen_val, moisture_val, ph_val, stress_level, coordinates)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fieldId, 'remediation_applied.png', targetNitrogen, targetMoisture, targetPh, stressLevel, JSON.stringify(coords)]
    );

    // Mark associated alerts for this sector as read
    await runAsync(
      `UPDATE alerts 
       SET read_status = 1 
       WHERE prediction_id IN (SELECT id FROM predictions WHERE field_id = ?)`,
      [fieldId]
    );

    res.json({
      success: true,
      message: `Sector '${field.name}' successfully remediated. Soil parameters reset to optimal levels.`,
      metrics: {
        nitrogen: targetNitrogen,
        moisture: targetMoisture,
        ph: targetPh,
        stress_level: stressLevel
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agronomy/report', async (req, res) => {
  const { fieldId } = req.body;
  if (!fieldId) {
    return res.status(400).json({ error: 'fieldId is required' });
  }

  try {
    // 1. Fetch current field sector parameters
    const field = await getAsync('SELECT * FROM field_data WHERE id = ?', [fieldId]);
    if (!field) {
      return res.status(404).json({ error: 'Field sector not found' });
    }
    
    // 2. Fetch latest prediction
    const currentMetric = await getAsync(
      'SELECT * FROM predictions WHERE field_id = ? ORDER BY created_at DESC LIMIT 1',
      [fieldId]
    );
    if (!currentMetric) {
      return res.status(400).json({ error: 'No sensor data available for this sector yet' });
    }

    // 3. Fetch past 7 days history for trend context
    const history = await allAsync(
      'SELECT nitrogen_val, moisture_val, ph_val, created_at FROM predictions WHERE field_id = ? ORDER BY created_at DESC LIMIT 7',
      [fieldId]
    );

    // 4. Load crop guidelines knowledge base (Local Catalog)
    const guidelinesPath = path.join(__dirname, 'crop_guidelines.json');
    const guidelines = JSON.parse(fs.readFileSync(guidelinesPath, 'utf8'));
    const cropInfo = guidelines.crops[field.crop_type];
    
    if (!cropInfo) {
      return res.status(400).json({ error: `No reference guidelines found for crop: ${field.crop_type}` });
    }

    // 5. Calculate exact volumes locally using guidelines logic (for deterministic verification)
    const area = field.area_acres;
    let waterVolumeLiters = 0;
    let nitrogenVolumeKg = 0;
    let correctiveActions = [];

    // Moisture calculation
    if (currentMetric.moisture_val < cropInfo.optimal_moisture_percent.min) {
      const deficit = cropInfo.optimal_moisture_percent.min - currentMetric.moisture_val;
      // Formula: Deficit * Area * 2000 Liters (custom volume model to raise moisture)
      waterVolumeLiters = Math.round(deficit * area * 2000);
      correctiveActions.push(`Irrigation Required: Dispense exactly **${waterVolumeLiters.toLocaleString()} Liters** of water across the ${area}-acre area to restore moisture from ${currentMetric.moisture_val}% to target ${cropInfo.optimal_moisture_percent.min}%.`);
    } else {
      correctiveActions.push("Moisture level is optimal. Suspend scheduled irrigation cycles to prevent over-watering.");
    }

    // Nitrogen calculation
    if (currentMetric.nitrogen_val < cropInfo.optimal_nitrogen_mg_kg.min) {
      const deficit = cropInfo.optimal_nitrogen_mg_kg.min - currentMetric.nitrogen_val;
      // Formula: Deficit * Area * 0.4 kg Urea
      nitrogenVolumeKg = Math.round(deficit * area * 0.4);
      correctiveActions.push(`Fertilization Required: Apply exactly **${nitrogenVolumeKg.toLocaleString()} kg** of Urea (46% N) to restore Nitrogen concentration from ${currentMetric.nitrogen_val} mg/kg to target ${cropInfo.optimal_nitrogen_mg_kg.min} mg/kg.`);
    } else {
      correctiveActions.push("Soil nitrogen reserves are sufficient. Do not apply nitrogenous fertilizer to avoid chemical runoffs.");
    }

    // pH adjustment
    if (currentMetric.ph_val < cropInfo.optimal_ph.min) {
      const limeQty = Math.round(500 * area);
      correctiveActions.push(`Soil Acidity Warning: Current soil pH is ${currentMetric.ph_val} (Optimal: ${cropInfo.optimal_ph.min}-${cropInfo.optimal_ph.max}). Apply **${limeQty} kg** of Agricultural Limestone (calcium carbonate) to neutralize soil acidity.`);
    } else if (currentMetric.ph_val > cropInfo.optimal_ph.max) {
      const sulfurQty = Math.round(150 * area);
      correctiveActions.push(`Soil Alkalinity Warning: Current soil pH is ${currentMetric.ph_val} (Optimal: ${cropInfo.optimal_ph.min}-${cropInfo.optimal_ph.max}). Apply **${sulfurQty} kg** of Elemental Sulfur to reduce pH.`);
    } else {
      correctiveActions.push("Soil pH balance is neutral. No chemical buffers are required.");
    }

    // 6. Build the RAG Context Prompt
    const trendText = history.map(h => `- ${h.created_at.slice(0, 10)}: N=${h.nitrogen_val}mg/kg, Moisture=${h.moisture_val}%, pH=${h.ph_val}`).join('\n');
    
    let prompt;
    const valStatus = currentMetric.validation_status || 'passed';
    const valCode = currentMetric.validation_code || 'SENSOR_OK';
    const valReason = currentMetric.validation_reason || 'Sensor returns are within normal operational limits.';

    if (valCode === 'SENSOR_QUENCHED') {
      prompt = `
You are an expert precision agriculture and soil remediation advisor. Generate a highly detailed, professional, and urgent "BIOLOGICAL REMEDIATION & TOXICITY REPORT" for a farm sector.
The Mycena chlorophos bioluminescent biosensors have experienced COMPLETE LUMINESCENCE QUENCHING. This indicates severe chemical contamination, heavy metal toxicity, or total biosensor death.

--- START RETRIEVED KNOWLEDGE BASE CONTEXT ---
Crop: ${cropInfo.name}
Field Sector: ${field.name}
Field Size: ${area} acres
Validation Status: CRITICAL SENSOR EXTINGUISHED / QUENCHED
Reason: ${valReason}

Urgent Guidelines:
1. Stop all chemical fertilization immediately. Runoffs will exacerbate soil toxicity.
2. Irrigate with clean water to dilute heavy metals/chemical residues.
3. Apply active carbon or bio-remediation micro-organisms (e.g., Pseudomonas putida) to absorb contaminants.
4. Re-inoculate a small test area with fresh mycelium plug spawn after 7 days of flush.
--- END RETRIEVED KNOWLEDGE BASE CONTEXT ---

Format your report using markdown. Start with a header "# URGENT BIOSENSOR EXTINGUISHED REPORT: ${field.name.toUpperCase()}".
Clearly outline the hazard, explain why standard irrigation or nitrogen fertilizer MUST be suspended, and highlight the biological remediation steps to revive the biosensor network.
`;
    } else if (valStatus === 'failed') {
      prompt = `
You are an expert precision agriculture advisor. Generate a "SENSOR LINK FAILURE & CALIBRATION REPORT" for a farm sector.
The sensor data validation has failed.

--- START RETRIEVED KNOWLEDGE BASE CONTEXT ---
Crop: ${cropInfo.name}
Field Sector: ${field.name}
Field Size: ${area} acres
Validation Status: FAILED
Validation Code: ${valCode}
Reason: ${valReason}
--- END RETRIEVED KNOWLEDGE BASE CONTEXT ---

Format your report using markdown. Start with a header "# SENSOR LINK FAILURE REPORT: ${field.name.toUpperCase()}".
Instruct the farmer to calibrate the sensor ribbon in the "Sensor Validation & Calibration" tab. Mention that high ambient light pollution (moonlight/stray light) or old mycelium age (>30 days) is preventing stable signal locks.
`;
    } else {
      prompt = `
You are an expert precision agriculture advisor. Generate a highly detailed, professional, and actionable plain-English "AI Agronomy Report" for a farm sector based on these retrieved parameters.

--- START RETRIEVED KNOWLEDGE BASE CONTEXT ---
Crop: ${cropInfo.name}
Field Sector: ${field.name}
Field Size: ${area} acres
Current Sensors Metrics:
- Nitrogen: ${currentMetric.nitrogen_val} mg/kg (Optimal target: ${cropInfo.optimal_nitrogen_mg_kg.min} - ${cropInfo.optimal_nitrogen_mg_kg.max} mg/kg)
- Moisture: ${currentMetric.moisture_val}% (Optimal target: ${cropInfo.optimal_moisture_percent.min} - ${cropInfo.optimal_moisture_percent.max}%)
- pH: ${currentMetric.ph_val} (Optimal target: ${cropInfo.optimal_ph.min} - ${cropInfo.optimal_ph.max})

7-Day Historical Trend:
${trendText}

Remediation Standards:
- Nitrogen: ${cropInfo.nitrogen_deficiency_treatment}
- Moisture: ${cropInfo.moisture_deficiency_treatment}
- pH Acidic: ${cropInfo.acidic_ph_treatment}
- pH Alkaline: ${cropInfo.alkaline_ph_treatment}
--- END RETRIEVED KNOWLEDGE BASE CONTEXT ---

--- CALCULATED EXACT RESTORATION QUANTITIES (DO NOT CHANGE THESE): ---
- Calculated Water Needed: ${waterVolumeLiters} Liters
- Calculated Urea Needed: ${nitrogenVolumeKg} kg
- Recommendations:
${correctiveActions.map(c => `  * ${c}`).join('\n')}

Format your report using markdown. Start with a header "AI AG agronomy REPORT: ${field.name.toUpperCase()}".
Ensure you provide a detailed, easy-to-read breakdown, explain the historical trends (whether it is degrading or recovering), and clearly highlight the exact water and fertilizer volumes calculated to restore balance.
`;
    }

    // 7. Invoke Gemini LLM API (if key is set)
    let reportMarkdown = '';
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (geminiKey) {
      console.log('Gemini API: Key found. Sending prompt to gemini-1.5-flash model...');
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        reportMarkdown = response.text();
      } catch (geminiErr) {
        console.error('Gemini API Error:', geminiErr.message);
        reportMarkdown = generateLocalTemplateReport(field, currentMetric, waterVolumeLiters, nitrogenVolumeKg, correctiveActions, trendText, { status: valStatus, code: valCode, reason: valReason });
      }
    } else {
      console.log('Gemini API: Key not set. Generating report using local RAG simulation...');
      reportMarkdown = generateLocalTemplateReport(field, currentMetric, waterVolumeLiters, nitrogenVolumeKg, correctiveActions, trendText, { status: valStatus, code: valCode, reason: valReason });
    }

    res.json({
      success: true,
      report: reportMarkdown,
      metrics: {
        field_name: field.name,
        crop: cropInfo.name,
        water_liters: waterVolumeLiters,
        urea_kg: nitrogenVolumeKg
      },
      validation: {
        status: valStatus,
        reason: valReason,
        code: valCode,
        ambient_lux: currentMetric.ambient_lux,
        mycelium_age: currentMetric.mycelium_age
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. CHATBOT RAG ASSISTANT ENDPOINT
// ==========================================

app.post('/api/agronomy/chat', async (req, res) => {
  const { fieldId, message } = req.body;
  if (!fieldId || !message) {
    return res.status(400).json({ error: 'fieldId and message are required' });
  }

  try {
    const field = await getAsync('SELECT * FROM field_data WHERE id = ?', [fieldId]);
    if (!field) {
      return res.status(404).json({ error: 'Field sector not found' });
    }

    const currentMetric = await getAsync(
      'SELECT * FROM predictions WHERE field_id = ? ORDER BY created_at DESC LIMIT 1',
      [fieldId]
    );

    const guidelinesPath = path.join(__dirname, 'crop_guidelines.json');
    const guidelines = JSON.parse(fs.readFileSync(guidelinesPath, 'utf8'));
    const cropInfo = guidelines.crops[field.crop_type];

    const nVal = currentMetric ? currentMetric.nitrogen_val : 'Unknown';
    const mVal = currentMetric ? currentMetric.moisture_val : 'Unknown';
    const phVal = currentMetric ? currentMetric.ph_val : 'Unknown';
    const stress = currentMetric ? currentMetric.stress_level : 'Unknown';

    const prompt = `
You are an expert precision agriculture advisor chatbot for the Vita-Core Sentinel AI platform.
The user (a farmer) is asking a question about their soil health. Use the following context to answer:

--- CONTEXT ---
Field Sector: ${field.name}
Crop: ${cropInfo ? cropInfo.name : field.crop_type}
Sector Size: ${field.area_acres} acres
Current Soil Parameters:
- Nitrogen: ${nVal} mg/kg (Target: ${cropInfo ? cropInfo.optimal_nitrogen_mg_kg.min : ''} - ${cropInfo ? cropInfo.optimal_nitrogen_mg_kg.max : ''} mg/kg)
- Moisture: ${mVal}% (Target: ${cropInfo ? cropInfo.optimal_moisture_percent.min : ''} - ${cropInfo ? cropInfo.optimal_moisture_percent.max : ''}%)
- pH: ${phVal} (Target: ${cropInfo ? cropInfo.optimal_ph.min : ''} - ${cropInfo ? cropInfo.optimal_ph.max : ''})
- Stress Index: ${stress}

Reference guidelines for this crop:
- Nitrogen Deficiency Treatment: ${cropInfo ? cropInfo.nitrogen_deficiency_treatment : ''}
- Moisture Deficiency Treatment: ${cropInfo ? cropInfo.moisture_deficiency_treatment : ''}
- Acidic pH Treatment: ${cropInfo ? cropInfo.acidic_ph_treatment : ''}
- Alkaline pH Treatment: ${cropInfo ? cropInfo.alkaline_ph_treatment : ''}

Mycena chlorophos Biosensor Details:
- Mycena chlorophos is a bioluminescent fungus that emits light at a peak wavelength of ~522 nm (vibrant green).
- Luminescence is highly sensitive to moisture (drops rapidly below 50% or above 90%) and pH (quenched in highly acidic <5.0 or highly alkaline >8.0 soil).
- Stronger glow indicates optimal soil moisture and metabolic stability of the mycelium.

User Message: "${message}"

Write a concise, professional, and helpful response. If relevant, reference calculations or the specific Mycena chlorophos biosensor behavior. Keep the answer structured using markdown.
`;

    let responseText = '';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      console.log('Gemini Chat API: Sending prompt...');
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        responseText = response.text();
      } catch (geminiErr) {
        console.error('Gemini API Chat Error:', geminiErr.message);
        responseText = generateLocalChatFallback(message, cropInfo, field, nVal, mVal, phVal, stress);
      }
    } else {
      console.log('Gemini Chat API: Key not set. Running local fallback chat...');
      responseText = generateLocalChatFallback(message, cropInfo, field, nVal, mVal, phVal, stress);
    }

    res.json({
      success: true,
      response: responseText
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateLocalChatFallback(message, cropInfo, field, nitrogen, moisture, ph, stress) {
  const msg = message.toLowerCase();

  if (msg.includes('mycena') || msg.includes('glow') || msg.includes('sensor') || msg.includes('chlorophos') || msg.includes('biolum')) {
    return `### 🍄 Mycena chlorophos Biosensor Calibration
The **Mycena chlorophos** biosensor inoculated in **${field.name}** glows with a peak spectral emission of **~522 nm** (green spectrum).

Here is how the glow correlates with your soil health:
*   **Moisture Response**: Mycena requires high humidity. Glow intensity peaks between **70% and 80% moisture**. If soil moisture drops below **50%**, the mycelial metabolic activity reduces, causing the glow to dim.
*   **pH Response**: The enzyme-substrate complex (luciferin-luciferase) in Mycena is highly pH-sensitive. The glow is brightest at **pH 6.0 - 6.5**. Extremes below **5.0** (acidic) or above **8.0** (alkaline) will quench the luminescence.
*   **Active Status**: Your current moisture is **${moisture}%** and pH is **${ph}**, meaning the mycelium is currently in a **${(moisture < 50 || ph < 5.0 || ph > 8.0) ? 'stressed (dimmed)' : 'healthy (vibrantly glowing)'}** state.`;
  }

  if (msg.includes('nitrogen') || msg.includes('urea') || msg.includes('fertilizer') || msg.includes('nutrient') || msg.includes('n ')) {
    let response = `### 🧪 Nitrogen & Fertilization Advisory for ${cropInfo ? cropInfo.name : field.crop_type}
*   **Current Soil Nitrogen**: **${nitrogen} mg/kg** (Target: ${cropInfo ? cropInfo.optimal_nitrogen_mg_kg.min + '-' + cropInfo.optimal_nitrogen_mg_kg.max : '120-200'} mg/kg).
`;
    if (cropInfo && nitrogen !== 'Unknown' && nitrogen < cropInfo.optimal_nitrogen_mg_kg.min) {
      const deficit = cropInfo.optimal_nitrogen_mg_kg.min - nitrogen;
      const ureaQty = Math.round(deficit * field.area_acres * 0.4);
      response += `*   **Deficiency**: Your nitrogen level is depleted by **${Math.round(deficit)} mg/kg**.
*   **Action Plan**: ${cropInfo.nitrogen_deficiency_treatment}
*   **Calculated Urea Quantity**: Apply exactly **${ureaQty.toLocaleString()} kg** of Urea across the **${field.area_acres} acres** of your field to restore balance.`;
    } else {
      response += `*   **Status**: Soil nitrogen levels are optimal! No immediate fertilization is necessary. Over-applying urea can lead to nitrate runoff and salt accumulation.`;
    }
    return response;
  }

  if (msg.includes('moisture') || msg.includes('water') || msg.includes('irrigate') || msg.includes('dry') || msg.includes('hydrat')) {
    let response = `### 💧 Irrigation & Moisture Management
*   **Current Soil Moisture**: **${moisture}%** (Target: ${cropInfo ? cropInfo.optimal_moisture_percent.min + '-' + cropInfo.optimal_moisture_percent.max : '60-80'}%).
`;
    if (cropInfo && moisture !== 'Unknown' && moisture < cropInfo.optimal_moisture_percent.min) {
      const deficit = cropInfo.optimal_moisture_percent.min - moisture;
      const waterQty = Math.round(deficit * field.area_acres * 2000);
      response += `*   **Deficiency**: Moisture is depleted by **${Math.round(deficit)}%** under the optimal threshold.
*   **Action Plan**: ${cropInfo.moisture_deficiency_treatment}
*   **Calculated Water Volume**: Dispense exactly **${waterQty.toLocaleString()} Liters** of water across the **${field.area_acres} acres**.`;
    } else {
      response += `*   **Status**: Soil moisture is optimal for your crops. Continue with standard ambient humidity checks.`;
    }
    return response;
  }

  if (msg.includes('ph') || msg.includes('acid') || msg.includes('alkaline') || msg.includes('neutral') || msg.includes('lime') || msg.includes('sulfur')) {
    let response = `### ⚖️ Soil pH & Chemical Buffering
*   **Current Soil pH**: **${ph}** (Target: ${cropInfo ? cropInfo.optimal_ph.min + '-' + cropInfo.optimal_ph.max : '6.0-7.0'}).
`;
    if (cropInfo && ph !== 'Unknown' && ph < cropInfo.optimal_ph.min) {
      const limeQty = Math.round(500 * field.area_acres);
      response += `*   **Status**: Soil is highly acidic!
*   **Action Plan**: ${cropInfo.acidic_ph_treatment}
*   **Calculated Limestone**: Apply **${limeQty.toLocaleString()} kg** of Agricultural Limestone to raise the pH.`;
    } else if (cropInfo && ph !== 'Unknown' && ph > cropInfo.optimal_ph.max) {
      const sulfurQty = Math.round(150 * field.area_acres);
      response += `*   **Status**: Soil is highly alkaline!
*   **Action Plan**: ${cropInfo.alkaline_ph_treatment}
*   **Calculated Elemental Sulfur**: Apply **${sulfurQty.toLocaleString()} kg** of Elemental Sulfur to reduce the pH.`;
    } else {
      response += `*   **Status**: Soil pH is perfectly balanced. No chemical buffering is needed at this time.`;
    }
    return response;
  }

  return `### 🌾 Vita-Core Precision Agronomy Assistant
Hello! I am your AI Agronomist chatbot. I have retrieved the parameters for **${field.name}** (Crop: **${cropInfo ? cropInfo.name : field.crop_type}**):
*   **Nitrogen**: ${nitrogen} mg/kg
*   **Moisture**: ${moisture}%
*   **Soil pH**: ${ph}
*   **Mycelial Status**: ${stress === 'high' ? '🚨 High Stress Detected' : '✅ Stable'}

You can ask me questions about:
1.  **Nitrogen / Urea requirements** for your field.
2.  **Water / Irrigation scheduling** to correct moisture deficits.
3.  **Soil pH balancing** using limestone or sulfur.
4.  **Mycena chlorophos** biosensor calibration and glow response.

What specific agronomy challenge can I help you resolve today?`;
}


// A local template generator mimicking LLM output using markdown
function generateLocalTemplateReport(field, current, water, urea, actions, trend, validation = {}) {
  const valStatus = validation.status || 'passed';
  const valCode = validation.code || 'SENSOR_OK';
  const valReason = validation.reason || 'Sensor returns are within normal operational limits.';

  if (valCode === 'SENSOR_QUENCHED') {
    return `
# URGENT BIOSENSOR EXTINGUISHED REPORT: ${field.name.toUpperCase()}
**Generated by Vita-Core Sentinel AI Engine (RAG-Local Fallback Model)**
**Timestamp:** ${new Date().toLocaleString()}

## 🚨 CRITICAL HAZARD ALERT: TOXICITY ENVELOPE DETECTED
The **Mycena chlorophos** biosensor ribbon has experienced complete glow extinction (0% signal return). This indicates the biological sensors have been destroyed or quenched by extreme soil conditions.

*   **Validation Status:** 🔴 FAILED (SENSOR_QUENCHED)
*   **Diagnostics:** ${valReason}
*   **Action Mandate:** **HALT ALL FERTILIZER AND STANDARD IRRIGATION IMMEDIATELY.**

---

## 🧪 Emergency Bio-Remediation Protocol
Standard agricultural operations are suspended to protect the water table and soil microbiome:

### 🚫 1. Fertilizer Suspension
*   **Status:** Over-fertilization under quenched states causes toxic chemical runoffs.
*   **Recommended Action:** Apply 0 kg of Nitrogen/Urea. Do not enrich the soil until pH and heavy metal levels stabilize.

### 💧 2. Dilution Irrigation
*   **Status:** Heavy metals or herbicide runoffs require soil flushing.
*   **Recommended Action:** Dispense a slow, low-volume flush of clean organic water to help leach contaminants from root zones.

### 🍄 3. Biosensor Rehabilitation
*   **Status:** Total biosensor death requires re-inoculation.
*   **Recommended Action:** Apply composted organic matter to raise soil biological buffer capacity. Re-inoculate with fresh Mycena chlorophos agar plugs in 7 days.
`;
  }

  if (valStatus === 'failed') {
    return `
# SENSOR LINK FAILURE REPORT: ${field.name.toUpperCase()}
**Generated by Vita-Core Sentinel AI Engine (RAG-Local Fallback Model)**
**Timestamp:** ${new Date().toLocaleString()}

## ⚠️ DIAGNOSTICS WARNING: SIGNAL DROWNED
Sensor readings cannot be verified due to signal degradation.

*   **Validation Status:** 🟡 FAILED (${valCode})
*   **Diagnostics:** ${valReason}

---

## 🛠️ Calibration Recommendations
1.  **Shield Ambient Light:** High ambient light pollution (lux > 10) is overriding bioluminescent green returns. Execute scans only after astronomical twilight.
2.  **Ribbon Re-inoculation:** If the mycelium age exceeds 30 days, biological decay has naturally dimmed the glow. Replace the bio-sensor ribbon.
3.  **Recalibrate Sliders:** Navigate to the **Sensor Validation & Calibration** tab, adjust the Luminescence Gain and Cutoff sliders to filter background noise, and click **Calibrate**.
`;
  }

  // Normal report template
  return `
# AI AGRONOMY REPORT: ${field.name.toUpperCase()}
**Generated by Vita-Core Sentinel AI Engine (RAG-Local Fallback Model)**
**Timestamp:** ${new Date().toLocaleString()}

## 📋 Executive Summary
A comprehensive soil analysis has been compiled for **${field.name}** containing **${field.area_acres} acres** of **${field.crop_type.toUpperCase()}**.
By correlating the visual bioluminescent glow metrics from the sensor ribbon with our local reference catalog, we have generated current soil indices.

*   **Overall Soil Health:** ${current.stress_level === 'high' ? '🚨 CRITICAL STRESS' : current.stress_level === 'medium' ? '⚠️ WARNING' : '✅ HEALTHY'}
*   **Active Soil Parameters:**
    *   **Nitrogen (N):** ${current.nitrogen_val} mg/kg
    *   **Soil Moisture:** ${current.moisture_val}%
    *   **Acidity/Alkalinity (pH):** ${current.ph_val}

---

## 📈 Historical 7-Day Trend Analysis
Our database has analyzed the latest visual drone images over the past week:
${trend}

*   **Assessment:** The moisture levels have showed a critical downward vector over the past 48 hours. Nitrogen levels are depleting due to high vegetative demands, requiring immediate remediation.

---

## 🧪 Exact Restoration Quantities & Calculations
To restore the optimal soil equilibrium needed for this specific crop, apply the following quantities:

### 💧 1. Moisture & Irrigation Restoration
*   **Current Soil Moisture:** ${current.moisture_val}%
*   **Exact Water Volume:** **${water.toLocaleString()} Liters**
*   **Action Plan:** Trigger irrigation systems for Sector ${field.id} immediately. Distribute the water evenly over the root-zone.

### 🧪 2. Nitrogen Fertilization
*   **Current Soil Nitrogen:** ${current.nitrogen_val} mg/kg
*   **Exact Urea quantity:** **${urea.toLocaleString()} kg**
*   **Action Plan:** Apply Urea granules (46% N) at a uniform density across the acreage. Do not over-apply to prevent chemical runoffs into surrounding irrigation channels.

### ⚖️ 3. pH Balancing
${actions.filter(a => a.includes('pH') || a.includes('Acidity')).join('\n') || '*   **Soil pH is balanced.** No acidic/alkaline buffer compounds are required.'}

---

## 👨‍🌾 Agronomist Field Recommendations
1.  **Irrigate Immediately:** Delaying watering by more than 24 hours will trigger crop cell wall damage.
2.  **Stagger Nitrogen Applications:** Apply 50% of the calculated Urea immediately, followed by the remaining 50% post-watering.
3.  **Scheduled Rescanning:** Schedule a drone sensor flight tomorrow at 9:00 PM to capture the next bioluminescent wavelength return.
`;
}

// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await initializeDb();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  }
});
