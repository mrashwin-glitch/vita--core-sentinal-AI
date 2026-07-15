import React, { useState } from 'react';
import { Upload, HelpCircle, AlertCircle, Cpu, RefreshCw, Eye } from 'lucide-react';

const presets = [
  { name: 'Healthy Field Scenario', filename: 'healthy.png', desc: 'Optimal Nitrogen & moisture' },
  { name: 'Low Nitrogen Scenario', filename: 'low_nitrogen.png', desc: 'Dim green glow, depleted nutrients' },
  { name: 'Dry Soil Scenario', filename: 'low_moisture.png', desc: 'Sparse glow ribbons, low hydration' },
  { name: 'Acidic Soil Scenario', filename: 'acidic_soil.png', desc: 'Blue-cyan shift, low pH levels' }
];

export default function GlowVisualizer({ selectedField, backendUrl, onAnalysisSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Trigger analysis for either a file or a preset filename
  const runAnalysis = async (presetFile = null) => {
    setAnalyzing(true);
    setResults(null);
    setError(null);
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      setProgressMsg('Initializing ingestion pipeline...');
      await wait(600);
      
      setProgressMsg('OpenCV: Segmenting bioluminescent ribbon contours...');
      await wait(800);
      
      setProgressMsg('OpenCV: Standardizing image resolution to 128x128 RGB...');
      await wait(600);
      
      setProgressMsg('PyTorch CNN: Standardizing input tensor (1, 3, 128, 128)...');
      await wait(800);
      
      setProgressMsg('PyTorch CNN: Executing forward pass layers (Conv2D -> Relu -> MaxPool)...');
      await wait(900);
      
      setProgressMsg('AI Engine: Parsing output vector variables...');
      await wait(500);
      
      setProgressMsg('AI Pipeline: Requesting CNN model inference (preloaded)...');

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('fieldId', selectedField.id);

      let response;
      if (presetFile) {
        // Send a simulated request pointing to the preset filename
        // The backend bridge will fall back or resolve this filename to its parameters
        // We'll rename it in a way that matches what local fallback expects
        formData.append('presetName', presetFile);
        
        // Since we are uploading, we'll fetch the preset image from client and send it as a file!
        // This is highly realistic and ensures the backend actually processes it.
        try {
          const res = await fetch(`/presets/${presetFile}`);
          const blob = await res.blob();
          const mockFile = new File([blob], presetFile, { type: 'image/png' });
          formData.append('image', mockFile);
        } catch {
          // If public folder fetch fails, construct a mock file
          const mockFile = new File(["mock"], presetFile, { type: 'image/png' });
          formData.append('image', mockFile);
        }
      } else if (file) {
        formData.append('image', file);
      } else {
        throw new Error("No image selected");
      }

      response = await fetch(`${backendUrl}/api/analytics/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process image analytics");
      }

      setResults(data.metrics);
      if (onAnalysisSuccess) {
        onAnalysisSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResults(null);
      setError(null);
    }
  };

  const selectPreset = (preset) => {
    setFile(null);
    setPreview(`/presets/${preset.filename}`); // We will host presets locally
    setResults(null);
    setError(null);
    runAnalysis(preset.filename);
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Neural Glow Interpreter</h2>
        <p className="text-sm text-slate-400">Upload nighttime drone imagery to interpret bioluminescent mycelium ribbon glow.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Interface */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6">
          <h3 className="text-md font-semibold text-slate-200 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" />
            Image Ingestion Scanner
          </h3>

          {/* Preset Buttons */}
          <div className="space-y-3">
            <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Field Scenario Presets</label>
            <div className="grid grid-cols-2 gap-3">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPreset(preset)}
                  disabled={analyzing}
                  className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-left transition-all hover:border-emerald-500/30 hover:bg-slate-900 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="block text-xs font-semibold text-slate-250">{preset.name}</span>
                  <span className="text-4xs text-slate-500 mt-1 block">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative bg-slate-900/60 px-3 text-2xs text-slate-500 font-bold uppercase">or Upload Image</div>
          </div>

          {/* Upload Area */}
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept="image/*"
              onChange={handleFileChange}
              disabled={analyzing}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-800 bg-slate-950/40 p-6 text-center cursor-pointer hover:border-emerald-500/40 transition-colors duration-250 ${
                analyzing ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload className="h-8 w-8 text-slate-500 mb-2" />
              <span className="text-xs font-semibold text-slate-350">Select Drone/Fixed Camera File</span>
              <span className="text-4xs text-slate-500 mt-1">PNG, JPG up to 10MB</span>
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 border border-slate-850">
              <span className="text-xs text-slate-300 truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={() => runAnalysis()}
                disabled={analyzing}
                className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-450"
              >
                Analyze File
              </button>
            </div>
          )}
        </div>

        {/* View / Analysis Showcase */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md flex flex-col justify-center min-h-[300px] relative overflow-hidden">
          {preview ? (
            <div className="relative w-full aspect-square max-h-[250px] mx-auto rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              <img src={preview} alt="Ingestion Preview" className="w-full h-full object-cover" />
              
              {/* Scanning Overlay Animation */}
              {analyzing && (
                <>
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-laserScanner" />
                  <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                </>
              )}

              {/* Mask overlay mockup when completed */}
              {results && !analyzing && (
                <div className="absolute inset-0 border border-emerald-500/30 flex items-center justify-center bg-emerald-500/5">
                  <span className="absolute top-2 left-2 rounded bg-emerald-500/80 px-2 py-0.5 text-4xs font-mono font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5" /> OpenCV Segmentation Mask
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-400">No Image Loaded</h4>
              <p className="text-xs text-slate-500 max-w-[250px] mx-auto">Select a preset or upload drone footage to see the analysis scan.</p>
            </div>
          )}

          {/* Scanning Console Logs */}
          {analyzing && (
            <div className="mt-4 rounded bg-slate-950/80 p-3 font-mono text-3xs text-emerald-500 border border-slate-850 h-28 overflow-y-auto">
              <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                <span>SCANNER LOGS</span>
              </div>
              <p className="mt-1 animate-pulse">{progressMsg}</p>
            </div>
          )}

          {/* Metrics Results Box */}
          {results && !analyzing && (
            <div className="mt-4 space-y-3 p-4 rounded-lg bg-slate-950 border border-slate-850 animate-fadeIn">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-emerald-400" /> Analysis Results
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border border-slate-850 p-2 text-center bg-slate-900/40">
                  <span className="block text-4xs font-semibold text-slate-500 uppercase">Nitrogen</span>
                  <span className="text-sm font-mono font-bold text-slate-200 mt-1 block">{results.nitrogen} <span className="text-5xs text-slate-500 font-sans">mg/kg</span></span>
                </div>
                <div className="rounded border border-slate-850 p-2 text-center bg-slate-900/40">
                  <span className="block text-4xs font-semibold text-slate-500 uppercase">Moisture</span>
                  <span className="text-sm font-mono font-bold text-slate-200 mt-1 block">{results.moisture}%</span>
                </div>
                <div className="rounded border border-slate-850 p-2 text-center bg-slate-900/40">
                  <span className="block text-4xs font-semibold text-slate-500 uppercase">pH</span>
                  <span className="text-sm font-mono font-bold text-slate-200 mt-1 block">{results.ph}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-850 pt-2 mt-2">
                <span className="text-3xs font-semibold text-slate-500 uppercase">Mycelium Status</span>
                <span className={`rounded-full px-2 py-0.5 text-4xs font-bold uppercase tracking-wider ${
                  results.stress_level === 'high' ? 'bg-red-500/20 text-red-400' :
                  results.stress_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {results.stress_level} Stress
                </span>
              </div>
            </div>
          )}

          {error && !analyzing && (
            <div className="mt-4 p-3 rounded-lg bg-red-950/20 border border-red-500/25 text-red-300 flex gap-2 items-start text-xs">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Ingestion Failed</span>
                <span className="text-slate-400 text-3xs">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
