const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'sentinel.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database sentinel.db');
  }
});

// Helper for running queries in sequence
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

const initializeDb = async () => {
  // Create tables
  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'farmer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS field_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      area_acres REAL NOT NULL,
      coordinate_bounds TEXT, -- JSON string
      crop_type TEXT DEFAULT 'rice'
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL,
      image_name TEXT,
      nitrogen_val REAL NOT NULL,
      moisture_val REAL NOT NULL,
      ph_val REAL NOT NULL,
      stress_level TEXT NOT NULL,
      coordinates TEXT, -- JSON string representing sector position on map
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (field_id) REFERENCES field_data(id)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      phone_number TEXT,
      read_status INTEGER DEFAULT 0, -- 0 for unread, 1 for read
      sms_dispatched_status INTEGER DEFAULT 0, -- 0 for not sent, 1 for sent
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prediction_id) REFERENCES predictions(id)
    )
  `);

  // Seed default admin user if empty
  const user = await getAsync('SELECT id FROM users WHERE email = ?', ['admin@vitacore.ai']);
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await runAsync(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Shivanesh V', 'admin@vitacore.ai', hash, 'admin']
    );
    console.log('Seeded default admin user: admin@vitacore.ai / admin123');
  }

  // Seed default fields if empty
  const fields = await allAsync('SELECT id FROM field_data');
  if (fields.length === 0) {
    const fieldSectors = [
      { name: 'Sector 1 (North Acreage)', area: 12.5, crop: 'rice', bounds: { lat: 12.9716, lng: 80.1846 } },
      { name: 'Sector 2 (South Ridge)', area: 8.2, crop: 'wheat', bounds: { lat: 12.9696, lng: 80.1836 } },
      { name: 'Sector 3 (East Valley)', area: 15.0, crop: 'maize', bounds: { lat: 12.9706, lng: 80.1866 } },
      { name: 'Sector 4 (West Terrace)', area: 10.4, crop: 'rice', bounds: { lat: 12.9726, lng: 80.1816 } }
    ];

    for (const f of fieldSectors) {
      await runAsync(
        'INSERT INTO field_data (name, area_acres, coordinate_bounds, crop_type) VALUES (?, ?, ?, ?)',
        [f.name, f.area, JSON.stringify(f.bounds), f.crop]
      );
    }
    console.log('Seeded default field sectors');
    
    // Seed historical prediction data to create realistic charts (past 7 days)
    const seededFields = await allAsync('SELECT id, crop_type FROM field_data');
    const now = new Date();
    
    for (const sf of seededFields) {
      // Create 7 days of daily records
      for (let day = 7; day >= 1; day--) {
        const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        const isoString = date.toISOString().slice(0, 19).replace('T', ' ');
        
        // Randomize readings slightly around typical values
        let nitrogen, moisture, ph;
        if (sf.crop_type === 'rice') {
          nitrogen = 140 + Math.sin(day) * 15 + (Math.random() * 10);
          moisture = 75 + Math.cos(day) * 5 + (Math.random() * 4);
          ph = 6.4 + Math.sin(day) * 0.2 + (Math.random() * 0.1);
        } else if (sf.crop_type === 'wheat') {
          nitrogen = 160 + Math.sin(day) * 20 + (Math.random() * 10);
          moisture = 52 + Math.cos(day) * 6 + (Math.random() * 4);
          ph = 6.8 + Math.sin(day) * 0.3 + (Math.random() * 0.1);
        } else { // maize
          nitrogen = 180 + Math.sin(day) * 25 + (Math.random() * 12);
          moisture = 62 + Math.cos(day) * 8 + (Math.random() * 5);
          ph = 6.2 + Math.sin(day) * 0.2 + (Math.random() * 0.1);
        }
        
        // Slightly deplete soil moisture & nitrogen towards "now" to make a deficiency trend
        if (day <= 2) {
          if (sf.id === 3) { // Sector 3 depletion (Moisture drop)
            moisture = moisture * 0.6; // Critical moisture drop!
          } else if (sf.id === 2) { // Sector 2 depletion (Nitrogen drop)
            nitrogen = nitrogen * 0.5; // Critical nitrogen drop!
          }
        }

        // Determine stress
        let stress = 'low';
        if (moisture < 25.0 || nitrogen < 60.0 || ph < 5.2) {
          stress = 'high';
        } else if (moisture < 40.0 || nitrogen < 100.0 || ph < 6.0) {
          stress = 'medium';
        }
        
        const coords = { x: 20 + sf.id * 15 + Math.sin(day)*2, y: 30 + sf.id * 10 + Math.cos(day)*2 };
        
        const predResult = await runAsync(`
          INSERT INTO predictions (field_id, image_name, nitrogen_val, moisture_val, ph_val, stress_level, coordinates, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sf.id, 
          `historical_day_${day}_sector_${sf.id}.png`, 
          Math.round(nitrogen * 10) / 10, 
          Math.round(moisture * 10) / 10, 
          Math.round(ph * 10) / 10, 
          stress, 
          JSON.stringify(coords),
          isoString
        ]);
        
        // If stress is high, log an alert
        if (stress === 'high') {
          let msg = `Critical moisture drop (${Math.round(moisture)}%) detected in ${sf.id === 3 ? 'Sector 3 (East Valley)' : 'Sector ' + sf.id}.`;
          if (nitrogen < 60) {
             msg = `Severe nitrogen depletion (${Math.round(nitrogen)} mg/kg) detected in ${sf.id === 2 ? 'Sector 2 (South Ridge)' : 'Sector ' + sf.id}.`;
          }
          await runAsync(`
            INSERT INTO alerts (prediction_id, message, phone_number, read_status, sms_dispatched_status, created_at)
            VALUES (?, ?, ?, 0, 1, ?)
          `, [predResult.lastID, msg, '+91-98765-43210', isoString]);
        }
      }
    }
    console.log('Seeded historical analytics and alerts');
  }
};

module.exports = {
  db,
  runAsync,
  allAsync,
  getAsync,
  initializeDb
};
