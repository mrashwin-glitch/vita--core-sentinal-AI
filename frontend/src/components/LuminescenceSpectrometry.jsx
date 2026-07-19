import React, { useState, useEffect, useRef } from 'react';
import { Sliders, RefreshCw, Info, CheckCircle2, Shield, ShieldAlert } from 'lucide-react';

const speciesList = [
  {
    id: 'mycena_chlorophos',
    name: 'Mycena chlorophos',
    commonName: 'Pale Green Bioluminescent Fungus',
    imageUrl: '/species/mycena_chlorophos.png',
    peakWavelength: 522,
    colorName: 'Vibrant Neon Green',
    colorHex: '#10b981',
    description: 'A tropical bioluminescent mushroom native to Asia. Emits a strong green glow. Highly sensitive to temperature shifts and moisture dropoff.',
    optimalMoisture: { min: 70, max: 85, peak: 77 },
    optimalPh: { min: 6.0, max: 6.8, peak: 6.4 },
    sensitivity: 'Extreme',
    glowIntensity: 'Very High (120 lm/m²)'
  },
  {
    id: 'panellus_stipticus',
    name: 'Panellus stipticus',
    commonName: 'Bitter Oyster / Glow-cap',
    imageUrl: '/species/panellus_stipticus.png',
    peakWavelength: 525,
    colorName: 'Soft Greenish-Blue',
    colorHex: '#14b8a6',
    description: 'An aggressive wood-decay fungus native to North America. Features a steady, long-lasting glow. Very resilient to mechanical handling.',
    optimalMoisture: { min: 60, max: 80, peak: 70 },
    optimalPh: { min: 5.8, max: 7.2, peak: 6.5 },
    sensitivity: 'Moderate',
    glowIntensity: 'Medium (45 lm/m²)'
  },
  {
    id: 'neonothopanus_gardneri',
    name: 'Neonothopanus gardneri',
    commonName: 'Coconut Glow Mushroom',
    imageUrl: '/species/neonothopanus_gardneri.png',
    peakWavelength: 530,
    colorName: 'Deep Vibrant Green',
    colorHex: '#22c55e',
    description: 'One of the brightest glowing mushrooms in the world, growing at the base of babassu palms in Brazil. Extremely sensitive to Nitrogen deficiencies.',
    optimalMoisture: { min: 65, max: 85, peak: 75 },
    optimalPh: { min: 6.2, max: 7.0, peak: 6.6 },
    sensitivity: 'High',
    glowIntensity: 'Maximum (180 lm/m²)'
  },
  {
    id: 'omphalotus_nidiformis',
    name: 'Omphalotus nidiformis',
    commonName: 'Ghost Fungus',
    imageUrl: '/species/omphalotus_nidiformis.png',
    peakWavelength: 528,
    colorName: 'Ghostly Pale Green',
    colorHex: '#86efac',
    description: 'Native to Australia, this fan-shaped forest biosensor is highly resilient to dry environments and displays high luminescence in slightly alkaline soil.',
    optimalMoisture: { min: 50, max: 75, peak: 62 },
    optimalPh: { min: 6.0, max: 7.8, peak: 6.9 },
    sensitivity: 'Low-Resilient',
    glowIntensity: 'High (85 lm/m²)'
  }
];

export default function LuminescenceSpectrometry({ selectedField, backendUrl, onCalibrationSaved }) {
  const [selectedSpecies, setSelectedSpecies] = useState(speciesList[0]);
  const [gain, setGain] = useState(1.2);
  const [cutoff, setCutoff] = useState(15);
  const [modelType, setModelType] = useState('sigmoidal');
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);

  // Ambient Interference States
  const [ambientLux, setAmbientLux] = useState(3);
  const [myceliumAge, setMyceliumAge] = useState(10);

  const spectrographCanvasRef = useRef(null);
  const moistureCanvasRef = useRef(null);
  const phCanvasRef = useRef(null);
  const ambientNoiseCanvasRef = useRef(null);

  // Fetch active calibrations from database for selected field
  useEffect(() => {
    if (!selectedField || !backendUrl) return;
    
    fetch(`${backendUrl}/api/analytics/calibration/${selectedField.id}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const spec = speciesList.find(s => s.id === data.species_id) || speciesList[0];
          setSelectedSpecies(spec);
          setGain(data.gain !== undefined ? data.gain : 1.2);
          setCutoff(data.cutoff !== undefined ? data.cutoff : 15);
          setAmbientLux(data.ambient_lux !== undefined ? data.ambient_lux : 3);
          setMyceliumAge(data.mycelium_age !== undefined ? data.mycelium_age : 10);
          setModelType(data.model_type || 'sigmoidal');
          setCalibrationSuccess(false);
        }
      })
      .catch(err => console.error('Error fetching sensor calibration:', err));
  }, [selectedField, backendUrl]);

  // Redraw Canvas spectrograph when species or sliders change
  useEffect(() => {
    drawSpectrograph();
    drawMoistureCurve();
    drawPhCurve();
    drawAmbientFilterGraph();
  }, [selectedSpecies, gain, cutoff, selectedField, ambientLux, myceliumAge]);

  const drawAmbientFilterGraph = () => {
    const canvas = ambientNoiseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Dark Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Draw Grid
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.5;
    for (let x = 30; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 15; y < h; y += 15) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const ageFactor = Math.max(0.1, 1 - (myceliumAge / 45));
    ctx.lineWidth = 1.2;

    // 1. Raw Signal (noisy)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    let startedRaw = false;
    for (let x = 0; x < w; x += 3) {
      const baseSignal = Math.sin(x * 0.08) * 15 * ageFactor + (h / 2);
      const noise = (Math.sin(x * 0.8) * ambientLux * 0.8) + (Math.random() - 0.5) * ambientLux * 0.5;
      const y = baseSignal + noise;
      if (!startedRaw) {
        ctx.moveTo(x, y); startedRaw = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 2. Filtered Signal (clean)
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.8;
    let startedClean = false;
    for (let x = 0; x < w; x += 3) {
      const y = Math.sin(x * 0.08) * 15 * ageFactor + (h / 2);
      if (!startedClean) {
        ctx.moveTo(x, y); startedClean = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = '8px monospace';
    ctx.fillText('RAW INPUT (NOISY)', 10, 10);
    ctx.fillStyle = '#10b981';
    ctx.fillText('FILTERED SIG', 10, 20);
  };

  const drawSpectrograph = () => {
    const canvas = spectrographCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Reset background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 50; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, height - 30);
      ctx.stroke();
    }
    for (let y = 20; y < height - 30; y += 30) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    // Label axes
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText('400nm', 40, height - 15);
    ctx.fillText('500nm', 140, height - 15);
    ctx.fillText('600nm', 240, height - 15);
    ctx.fillText('700nm', 340, height - 15);
    ctx.fillText('Int', 10, 25);

    // Draw the wavelength spectrum gradient under the curve
    const peak = selectedSpecies.peakWavelength;
    const peakX = 40 + ((peak - 400) / 300) * (width - 60);

    ctx.lineWidth = 2.5;

    // Draw curve
    ctx.beginPath();
    let started = false;

    // We plot from 400nm to 700nm
    for (let x = 40; x < width - 10; x += 3) {
      const wavelength = 400 + ((x - 40) / (width - 50)) * 300;
      
      // Calculate gaussian distribution intensity around the peak wavelength
      // peak value adjusted by gain and cutoff
      const stdDev = 15; // bandwidth of glow
      const exponent = -Math.pow(wavelength - peak, 2) / (2 * Math.pow(stdDev, 2));
      let val = Math.exp(exponent) * (height - 60) * gain;

      // Apply noise cutoff threshold
      if (val < cutoff) val = 0;

      const y = height - 30 - val;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Stroke the curve outline with species color
    ctx.strokeStyle = selectedSpecies.colorHex;
    ctx.stroke();

    // Fill area below the curve with species gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${selectedSpecies.colorHex}55`);
    gradient.addColorStop(1, '#02061700');
    ctx.fillStyle = gradient;
    ctx.lineTo(width - 15, height - 30);
    ctx.lineTo(40, height - 30);
    ctx.fill();

    // Mark peak wavelength
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(`Peak: ${peak}nm`, peakX - 25, height - 30 - 20 - (gain * 15));
    ctx.beginPath();
    ctx.arc(peakX, height - 30 - (height - 60) * gain * 0.9, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  };

  const drawMoistureCurve = () => {
    const canvas = moistureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Reset
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const opt = selectedSpecies.optimalMoisture;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    // Draw Bell Curve
    ctx.beginPath();
    for (let x = 10; x < width - 10; x += 3) {
      const moisturePct = (x / width) * 100;
      // Bell curve equation peaked at opt.peak
      const exponent = -Math.pow(moisturePct - opt.peak, 2) / (2 * Math.pow(15, 2));
      const y = height - 15 - Math.exp(exponent) * (height - 35);
      if (x === 10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw current field moisture dot
    const currentM = selectedField.moisture_val || 50;
    const dotX = (currentM / 100) * width;
    const dotExponent = -Math.pow(currentM - opt.peak, 2) / (2 * Math.pow(15, 2));
    const dotY = height - 15 - Math.exp(dotExponent) * (height - 35);

    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`Current: ${currentM}%`, dotX - 25, dotY - 10);
    ctx.fillText('0%', 5, height - 3);
    ctx.fillText('100%', width - 30, height - 3);
  };

  const drawPhCurve = () => {
    const canvas = phCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Reset
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const opt = selectedSpecies.optimalPh;

    ctx.beginPath();
    for (let x = 10; x < width - 10; x += 3) {
      const phVal = (x / width) * 14;
      const exponent = -Math.pow(phVal - opt.peak, 2) / (2 * Math.pow(1.0, 2));
      const y = height - 15 - Math.exp(exponent) * (height - 35);
      if (x === 10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    const currentPh = selectedField.ph_val || 7.0;
    const dotX = (currentPh / 14) * width;
    const dotExponent = -Math.pow(currentPh - opt.peak, 2) / (2 * Math.pow(1.0, 2));
    const dotY = height - 15 - Math.exp(dotExponent) * (height - 35);

    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`Current: ${currentPh}`, dotX - 25, dotY - 10);
    ctx.fillText('0', 5, height - 3);
    ctx.fillText('14', width - 15, height - 3);
  };

  const startCalibration = () => {
    if (!selectedField || !backendUrl) return;

    setCalibrating(true);
    setCalibrationSuccess(false);

    fetch(`${backendUrl}/api/analytics/calibrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldId: selectedField.id,
        speciesId: selectedSpecies.id,
        gain,
        cutoff,
        modelType,
        ambientLux,
        myceliumAge
      })
    })
      .then(res => res.json())
      .then(data => {
        setCalibrating(false);
        if (data.success) {
          setCalibrationSuccess(true);
          if (onCalibrationSaved) {
            onCalibrationSaved();
          }
        } else {
          alert('Failed to save calibration: ' + data.error);
        }
      })
      .catch(err => {
        setCalibrating(false);
        console.error('Error saving sensor calibration:', err);
      });
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Sensor Validation & Calibration</h2>
        <p className="text-sm text-slate-400">Calibrate mycelial bioluminescent parameters, adjust ambient noise thresholds, and track SNR metrics.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Species selector and stats */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">Select Biosensor Organism</h3>
          
          <div className="space-y-2">
            {speciesList.map((species) => (
              <button
                key={species.id}
                onClick={() => {
                  setSelectedSpecies(species);
                  setCalibrationSuccess(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                  selectedSpecies.id === species.id
                    ? 'bg-slate-950 border-emerald-500 shadow-md shadow-emerald-500/5'
                    : 'bg-slate-950/40 border-slate-850 hover:bg-slate-950/80 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-12 rounded overflow-hidden border border-slate-800 bg-black flex-shrink-0">
                    <img src={species.imageUrl} alt={species.name} className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-200 italic">{species.name}</span>
                    <span className="text-5xs font-sans text-slate-500 uppercase tracking-wider">{species.commonName}</span>
                  </div>
                </div>
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor] mr-1"
                  style={{ color: species.colorHex, backgroundColor: species.colorHex }}
                />
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3 text-xs">
            {/* Large Species Preview Image */}
            <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-850 bg-black">
              <img src={selectedSpecies.imageUrl} alt={selectedSpecies.name} className="w-full h-full object-cover opacity-75" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <span className="absolute bottom-2 left-2 text-[8px] font-mono font-bold tracking-widest text-slate-400 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-850 uppercase">
                {selectedSpecies.colorName} Spectrum
              </span>
            </div>
            <div>
              <span className="text-4xs font-bold text-slate-500 uppercase">Description</span>
              <p className="text-slate-400 mt-1 leading-relaxed">{selectedSpecies.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-4xs font-bold text-slate-500 uppercase">Sensitivity</span>
                <p className="font-semibold text-slate-350">{selectedSpecies.sensitivity}</p>
              </div>
              <div>
                <span className="text-4xs font-bold text-slate-500 uppercase">Glow Peak</span>
                <p className="font-semibold text-slate-350">{selectedSpecies.glowIntensity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center column: Spectrograph and calibration sliders */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center justify-between">
            <span>Peak Spectral Emission</span>
            <span className="text-3xs font-mono text-emerald-500 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
              {selectedSpecies.peakWavelength} nm ({selectedSpecies.colorName})
            </span>
          </h3>

          <canvas
            ref={spectrographCanvasRef}
            width={400}
            height={150}
            className="w-full rounded bg-slate-950 border border-slate-850"
          />

          <div className="border-t border-slate-800 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Sliders className="h-3 w-3 text-emerald-400" /> Sensor Calibration Triggers
              </span>
              <span className="text-4xs text-slate-500">Transduction Model: <b className="uppercase text-slate-400">{modelType}</b></span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-4xs font-semibold text-slate-400 mb-1">
                  <span>Luminescence Gain (Multiplier)</span>
                  <span className="text-emerald-400 font-mono">{gain.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={gain}
                  onChange={(e) => {
                    setGain(parseFloat(e.target.value));
                    setCalibrationSuccess(false);
                  }}
                  className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-4xs font-semibold text-slate-400 mb-1">
                  <span>Background Noise Cutoff (Luminance units)</span>
                  <span className="text-emerald-400 font-mono">{cutoff} lm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={cutoff}
                  onChange={(e) => {
                    setCutoff(parseInt(e.target.value));
                    setCalibrationSuccess(false);
                  }}
                  className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['linear', 'logarithmic', 'sigmoidal'].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setModelType(m);
                      setCalibrationSuccess(false);
                    }}
                    className={`text-3xs font-bold uppercase py-1.5 px-0.5 rounded border text-center transition-all ${
                      modelType === m
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900'
                    }`}
                  >
                    {m === 'logarithmic' ? 'Log' : m === 'sigmoidal' ? 'Sigmoid' : 'Linear'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Environmental response curves */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">Environmental Response Profiles</h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-4xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Luminescence vs Moisture</span>
                <canvas
                  ref={moistureCanvasRef}
                  width={400}
                  height={80}
                  className="w-full rounded bg-slate-950 border border-slate-850"
                />
              </div>

              <div>
                <span className="text-4xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Luminescence vs pH</span>
                <canvas
                  ref={phCanvasRef}
                  width={400}
                  height={80}
                  className="w-full rounded bg-slate-950 border border-slate-850"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            <button
              onClick={startCalibration}
              disabled={calibrating || calibrationSuccess}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                calibrationSuccess
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 hover:border-emerald-500/40 hover:bg-slate-900'
              }`}
            >
              {calibrating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  Calibrating Biosensors...
                </>
              ) : calibrationSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />
                  Ribbon Calibration Complete
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Calibrate Biosensor Ribbon
                </>
              )}
            </button>

            <div className="rounded bg-slate-950 p-2 text-5xs font-mono text-slate-500 flex gap-2">
              <Info className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              <p>
                Calibration coefficients determine the mapping between mycelial green glow intensity return and regression output metrics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ambient Interference & Degradation Diagnostics */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6 mt-6">
        <div className="border-l-4 border-emerald-500 pl-4 text-left">
          <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
            Adaptive Ambient Interference Filtration & Degradation Diagnostics
          </h3>
          <p className="text-3xs text-slate-400">Calibrate optical filters against moonlight/stray light and account for biological mycelial age degradation.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Sliders */}
          <div className="space-y-4 text-xs text-left">
            {/* Ambient Lux */}
            <div className="space-y-1">
              <div className="flex justify-between text-4xs font-bold uppercase">
                <span className="text-slate-450">Ambient Light Pollution</span>
                <span className="text-emerald-400 font-mono">{ambientLux} Lux (Moonlight)</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={ambientLux}
                onChange={(e) => setAmbientLux(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
              />
            </div>

            {/* Mycelial Age */}
            <div className="space-y-1">
              <div className="flex justify-between text-4xs font-bold uppercase">
                <span className="text-slate-450">Mycelium Inoculation Age</span>
                <span className="text-emerald-400 font-mono">{myceliumAge} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max="45"
                step="1"
                value={myceliumAge}
                onChange={(e) => setMyceliumAge(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Diagnostic readout */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-850 font-mono text-[10px] text-slate-350 space-y-2 flex flex-col justify-center text-left">
            <span className="text-4xs font-bold text-emerald-500 uppercase tracking-widest block border-b border-slate-900 pb-1.5 mb-1.5">Sensor Signal Link Diagnostics</span>
            <p><b className="text-slate-500">Peak Glow Output:</b> {(180 * Math.max(0.1, 1 - (myceliumAge / 45))).toFixed(0)} RFU</p>
            <p><b className="text-slate-500">Ambient Background Noise:</b> {ambientLux * 15} RFU</p>
            <p>
              <b className="text-slate-500">Signal-To-Noise (SNR):</b>{' '}
              <span className={`font-bold ${
                (20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))) > 15 ? 'text-emerald-400' :
                (20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))) >= 8 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {(20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))).toFixed(1)} dB
              </span>
            </p>
            <p>
              <b className="text-slate-500">Status Check:</b>{' '}
              <span className={`font-bold ${
                (20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))) > 15 ? 'text-emerald-450' :
                (20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))) >= 8 ? 'text-yellow-450' : 'text-red-450'
              }`}>
                {(20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))) > 15 ? 'LOCK_OK' :
                 (20 * Math.log10((180 * Math.max(0.1, 1 - (myceliumAge / 45))) / Math.max(1, Math.max(1, ambientLux * 15)))) >= 8 ? 'WARN_NOISE' : 'SIGNAL_DROWNED'
                }
              </span>
            </p>
          </div>

          {/* Canvas Waveforms */}
          <div className="flex flex-col justify-center text-left">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Oscilloscope Signal Separation</span>
            <canvas
              ref={ambientNoiseCanvasRef}
              className="w-full h-20 rounded bg-slate-950 border border-slate-850"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
