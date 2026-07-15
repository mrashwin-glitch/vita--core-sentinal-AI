const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sentinel.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

// Run a query and return rows
function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function showDatabase() {
  console.log('\n======================================================');
  console.log('       VITA-CORE SENTINEL AI - DATABASE EXPLORER      ');
  console.log('======================================================\n');
  
  try {
    // 1. Users Table
    console.log('🔹 TABLE: users');
    const users = await queryAll('SELECT id, name, email, role, created_at FROM users');
    console.table(users);
    console.log('\n------------------------------------------------------\n');

    // 2. Field Data Table
    console.log('🔹 TABLE: field_data');
    const fields = await queryAll('SELECT id, name, area_acres, crop_type, coordinate_bounds FROM field_data');
    console.table(fields.map(f => ({
      id: f.id,
      name: f.name,
      'area (acres)': f.area_acres,
      'crop type': f.crop_type,
      coordinates: f.coordinate_bounds
    })));
    console.log('\n------------------------------------------------------\n');

    // 3. Predictions Table (Last 10 rows)
    console.log('🔹 TABLE: predictions (Latest 10 entries)');
    const predictions = await queryAll(`
      SELECT p.id, f.name as field_name, p.image_name, p.nitrogen_val, p.moisture_val, p.ph_val, p.stress_level, p.created_at
      FROM predictions p
      JOIN field_data f ON p.field_id = f.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    console.table(predictions.map(p => ({
      id: p.id,
      field: p.field_name,
      image: p.image_name || 'N/A',
      'nitrogen (mg/kg)': p.nitrogen_val.toFixed(1),
      'moisture (%)': p.moisture_val.toFixed(1),
      'pH': p.ph_val.toFixed(2),
      'stress level': p.stress_level,
      'timestamp': p.created_at
    })));
    console.log('\n------------------------------------------------------\n');

    // 4. Alerts Table (Last 10 rows)
    console.log('🔹 TABLE: alerts (Latest 10 entries)');
    const alerts = await queryAll(`
      SELECT a.id, a.prediction_id, a.message, a.phone_number, a.read_status, a.sms_dispatched_status, a.created_at
      FROM alerts a
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    console.table(alerts.map(a => ({
      id: a.id,
      'pred ID': a.prediction_id,
      message: a.message,
      phone: a.phone_number || 'None',
      read: a.read_status === 1 ? 'Yes' : 'No',
      sms_sent: a.sms_dispatched_status === 1 ? 'Yes' : 'No',
      'timestamp': a.created_at
    })));

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    db.close();
  }
}

showDatabase();
