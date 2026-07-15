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

app.post('/api/analytics/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  
  const fieldId = parseInt(req.body.fieldId) || 1;
  const imagePath = req.file.path;
  const imageName = req.file.filename;
  
  try {
    // 1. Fetch field data to identify bounds and metadata
    const field = await getAsync('SELECT * FROM field_data WHERE id = ?', [fieldId]);
    if (!field) {
      return res.status(404).json({ error: 'Field sector not found' });
    }
    
    // 2. Run Python CNN image analyzer
    const aiResult = await runAIAnalysis(imagePath, req.file.originalname);
    
    if (!aiResult.success) {
      return res.status(500).json({ error: 'AI analysis failed', details: aiResult.error });
    }
    
    const { nitrogen, moisture, ph, stress_level } = aiResult;
    
    // Random offset points for visualization inside the sector bounds
    const baseBounds = JSON.parse(field.coordinate_bounds);
    const coords = {
      x: Math.floor(Math.random() * 40) + 30, // Percentage coordinates for dashboard Canvas mapping
      y: Math.floor(Math.random() * 40) + 30
    };
    
    // 3. Save prediction to DB
    const insertResult = await runAsync(
      `INSERT INTO predictions (field_id, image_name, nitrogen_val, moisture_val, ph_val, stress_level, coordinates)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fieldId, imageName, nitrogen, moisture, ph, stress_level, JSON.stringify(coords)]
    );
    
    const predictionId = insertResult.lastID;
    
    // 4. Trigger automated SMS log if stress is high (deficiency detected)
    let smsDispatched = false;
    if (stress_level === 'high') {
      let alertMessage = `VITA-CORE SENTINEL ALERT: High stress detected in ${field.name}. `;
      const issues = [];
      if (moisture < 30) issues.push(`Critical Moisture Drop (${moisture}%)`);
      if (nitrogen < 70) issues.push(`Severe Nitrogen Depletion (${nitrogen} mg/kg)`);
      if (ph < 5.5) issues.push(`Highly Acidic Soil (pH ${ph})`);
      if (ph > 8.0) issues.push(`Highly Alkaline Soil (pH ${ph})`);
      
      alertMessage += issues.join(' & ') + `. Immediate corrective irrigation/fertilization recommended.`;
      
      smsDispatched = await dispatchSMS('+91-99880-12345', alertMessage, predictionId);
    }
    
    res.json({
      success: true,
      predictionId,
      metrics: { nitrogen, moisture, ph, stress_level },
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
    
    const prompt = `
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

Format your report using markdown. Start with a header "AI AG agronomy REPORT: [Sector Name]".
Ensure you provide a detailed, easy-to-read breakdown, explain the historical trends (whether it is degrading or recovering), and clearly highlight the exact water and fertilizer volumes calculated to restore balance.
`;

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
        reportMarkdown = generateLocalTemplateReport(field, currentMetric, waterVolumeLiters, nitrogenVolumeKg, correctiveActions, trendText);
      }
    } else {
      console.log('Gemini API: Key not set. Generating report using local RAG simulation...');
      reportMarkdown = generateLocalTemplateReport(field, currentMetric, waterVolumeLiters, nitrogenVolumeKg, correctiveActions, trendText);
    }

    res.json({
      success: true,
      report: reportMarkdown,
      metrics: {
        field_name: field.name,
        crop: cropInfo.name,
        water_liters: waterVolumeLiters,
        urea_kg: nitrogenVolumeKg
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A local template generator mimicking LLM output using markdown
function generateLocalTemplateReport(field, current, water, urea, actions, trend) {
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
*   **Current Deficiency:** Target Min Moisture - Current = ${(current.moisture_val).toFixed(1)}% vs optimal range.
*   **Exact Water Volume:** **${water.toLocaleString()} Liters**
*   **Action Plan:** Trigger irrigation systems for Sector ${field.id} immediately. Distribute the water evenly over the root-zone.

### 🧪 2. Nitrogen Fertilization
*   **Current Deficiency:** Target Min Nitrogen - Current = ${(current.nitrogen_val).toFixed(1)} mg/kg.
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
