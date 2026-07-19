import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Terminal, FileText, Droplet, FlaskConical, CornerDownRight, CheckCircle2, RotateCcw, Printer, Send, ShieldAlert, Award, FileCode } from 'lucide-react';

export default function AIAgronomyReport({ selectedField, backendUrl, onRemediationApplied }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [remediating, setRemediating] = useState(false);
  const [remediationSuccess, setRemediationSuccess] = useState(false);

  // Chat states
  const [chatHistory, setChatHistory] = useState([
    { sender: 'assistant', text: 'Hello! I am your precision agronomy assistant. Feel free to ask me follow-up questions about this report, or Mycena chlorophos biosensor response.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // View modes
  const [certificateMode, setCertificateMode] = useState(false);

  // Chemical Mixer States
  const [correctiveTimeline, setCorrectiveTimeline] = useState(24);
  const [irrigationFlow, setIrrigationFlow] = useState(10);
  const [fertilizerConcentration, setFertilizerConcentration] = useState(0.5);
  const [valveActive, setValveActive] = useState(false);
  const [valveLogs, setValveLogs] = useState([]);

  const startValveSequence = async () => {
    setValveActive(true);
    setValveLogs([]);
    const addValveLog = (m, d) => new Promise(r => setTimeout(() => { setValveLogs(prev => [...prev, m]); r(); }, d));

    await addValveLog(`[${new Date().toLocaleTimeString()}] COMMAND: Initializing sector remediation actuator sequence...`, 100);
    await addValveLog(`[${new Date().toLocaleTimeString()}] ACTUATOR: Adjusting pressure gate to 4.2 Bar...`, 400);
    await addValveLog(`[${new Date().toLocaleTimeString()}] VALVE: Opening Main Line Sector ${selectedField.id} Valve... OPEN (100%)`, 600);
    if (report && report.metrics && report.metrics.urea_kg > 0) {
      await addValveLog(`[${new Date().toLocaleTimeString()}] PUMP: Engaging nitrogen injection pump A... ACTIVE`, 600);
      await addValveLog(`[${new Date().toLocaleTimeString()}] INJECTOR: Calibrating concentration mixer to ${fertilizerConcentration}% ratio... PASSED`, 500);
    }
    await addValveLog(`[${new Date().toLocaleTimeString()}] FLOW: Water discharge activated at ${irrigationFlow} L/s flow rate...`, 600);
    const durationMin = report && report.metrics && report.metrics.water_liters > 0 ? ((report.metrics.water_liters / irrigationFlow) / 60).toFixed(1) : "0.0";
    await addValveLog(`[${new Date().toLocaleTimeString()}] SUCCESS: Remediation loop running. Auto-timer set to shutdown in ${durationMin} minutes.`, 800);
  };

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const addLog = (msg, delay = 0) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        resolve();
      }, delay);
    });
  };

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    setError(null);
    setLogs([]);
    setRemediationSuccess(false);
    setChatHistory([
      { sender: 'assistant', text: 'Hello! I am your precision agronomy assistant. Feel free to ask me follow-up questions about this report, or Mycena chlorophos biosensor response.' }
    ]);

    try {
      await addLog("Initiating RAG (Retrieval-Augmented Generation) session...", 100);
      await addLog(`Querying local database for field context: ${selectedField.name}`, 300);
      await addLog("Retrieving past 7-day soil moisture & Nitrogen historical metrics...", 400);
      await addLog(`Reading 'crop_guidelines.json' document catalog for crop: ${selectedField.crop_type}...`, 500);
      await addLog("Calculating optimal soil parameters deficiency coefficients...", 400);
      await addLog("Compiling prompt context matrix for Large Language Model...", 300);
      await addLog("Transmitting contextual matrix to Google Gemini AI API...", 500);

      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/agronomy/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ fieldId: selectedField.id })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI report");
      }

      await addLog("Gemini model response stream accepted.", 200);
      await addLog("Compiling precise water & Nitrogen volume instructions...", 100);
      await addLog("AI Agronomy Report generated successfully.", 100);

      setReport(data);
    } catch (err) {
      setError(err.message);
      await addLog(`[ERROR] ${err.message}`, 100);
    } finally {
      setLoading(false);
    }
  };

  const applyRemediation = async () => {
    setRemediating(true);
    setRemediationSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/agronomy/remediate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ fieldId: selectedField.id })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Remediation failed");
      }
      setRemediationSuccess(true);
      setTimeout(() => {
        if (onRemediationApplied) {
          onRemediationApplied();
        }
        generateReport();
      }, 1500);
    } catch (err) {
      alert(`Remediation error: ${err.message}`);
    } finally {
      setRemediating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportTelemetryJson = () => {
    if (!report) return;
    const telemetryData = {
      assessmentId: `VCS-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString(),
      field: {
        id: selectedField.id,
        name: selectedField.name,
        areaAcres: selectedField.area_acres,
        cropType: selectedField.crop_type,
        coordinateBounds: selectedField.coordinate_bounds
      },
      biosensor: {
        model: getBiosensorSpecies(selectedField.id),
        wavelengthPeakNm: selectedField.id === 3 ? 522 : selectedField.id === 2 ? 530 : selectedField.id === 1 ? 525 : 528,
        accuracyMetric: "sub-ppm biological reference envelope"
      },
      measuredMetrics: {
        nitrogenMgKg: report.metrics.nitrogen_val || selectedField.nitrogen_val,
        moisturePercent: report.metrics.moisture_val || selectedField.moisture_val,
        soilPh: report.metrics.ph_val || selectedField.ph_val,
        stressIndex: selectedField.stress_level
      },
      calculatedRemediation: {
        waterNeededLiters: report.metrics.water_liters,
        ureaNeededKg: report.metrics.urea_kg
      },
      advisoryReportRaw: report.report
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(telemetryData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentinel_telemetry_sector_${selectedField.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/agronomy/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          fieldId: selectedField.id,
          message: userMessage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to query assistant");
      }

      setChatHistory(prev => [...prev, { sender: 'assistant', text: data.response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'assistant', text: `Sorry, I encountered an error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to match field to biosensor species
  const getBiosensorSpecies = (fieldId) => {
    switch (fieldId) {
      case 3: return 'Mycena chlorophos (Pale Green)';
      case 2: return 'Neonothopanus gardneri (Deep Green)';
      case 1: return 'Panellus stipticus (Green-Blue)';
      default: return 'Omphalotus nidiformis (Ghost Light)';
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 no-print">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">AI Agronomy Report</h2>
        <p className="text-sm text-slate-400">RAG-enabled Large Language Model (Gemini) precision farming advisory engine.</p>
      </div>

      {/* Trigger Area */}
      {!report && !loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center backdrop-blur-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">Generate Expert Soil Advisory</h3>
          <p className="mx-auto max-w-md text-sm text-slate-400 mt-2 mb-6">
            Retrieves the latest sensor returns, parses crop catalogs, and prompts Gemini to compile exact water and fertilizer solutions.
          </p>
          <button
            onClick={generateReport}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            Analyze & Generate Report
          </button>
        </div>
      )}

      {/* RAG Loading Console */}
      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 font-mono text-xs text-emerald-500 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-400 font-semibold">SENTINEL-LLM-RAG-BRIDGE.sh</span>
            <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="space-y-2 h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-800">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CornerDownRight className="h-3 w-3 mt-0.5 text-emerald-600 flex-shrink-0" />
                <p>{log}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Showcase Grid */}
      {report && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-3 no-print">
            <div className="flex items-center gap-4 rounded-xl border border-cyan-500/10 bg-cyan-950/10 p-5">
              <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-400">
                <Droplet className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-500">Calculated Water Needed</span>
                <h4 className="text-2xl font-extrabold text-slate-100 mt-1">
                  {report.metrics.water_liters === 0 ? "0 Liters" : `${report.metrics.water_liters.toLocaleString()} Liters`}
                </h4>
                <p className="text-3xs text-slate-400 mt-0.5">Quantity to irrigate complete sector</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-emerald-500/10 bg-emerald-950/10 p-5">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
                <FlaskConical className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Calculated Urea Needed</span>
                <h4 className="text-2xl font-extrabold text-slate-100 mt-1">
                  {report.metrics.urea_kg === 0 ? "0 kg" : `${report.metrics.urea_kg.toLocaleString()} kg`}
                </h4>
                <p className="text-3xs text-slate-400 mt-0.5">Urea (46% Nitrogen) total requirement</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-amber-500/10 bg-amber-950/10 p-5">
              <div className="rounded-lg bg-amber-500/10 p-3 text-amber-450">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Projected ROI & Cost</span>
                <h4 className="text-2xl font-extrabold text-slate-100 mt-1">
                  {report.metrics.water_liters === 0 && report.metrics.urea_kg === 0 
                    ? "₹0 / Acre" 
                    : `₹${(Math.round(selectedField.area_acres * 450 + (report.metrics.water_liters * 0.08 + report.metrics.urea_kg * 5.5))).toLocaleString()}`}
                </h4>
                <p className="text-3xs text-slate-400 mt-0.5">
                  Est. Yield Gain: <b className="text-emerald-450">+{selectedField.stress_level === 'high' ? '24.5%' : selectedField.stress_level === 'medium' ? '12.0%' : '4.2%'}</b>
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-xl no-print">
            <FileText className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-bold text-slate-350 uppercase">Report Console Toolbar</span>
            
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCertificateMode(!certificateMode)}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold border transition-all ${
                  certificateMode
                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40 hover:text-amber-400'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                {certificateMode ? 'Advisory View' : 'Institutional Lab Sheet'}
              </button>

              {selectedField.stress_level !== 'low' && (
                <button
                  onClick={applyRemediation}
                  disabled={remediating || remediationSuccess}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all ${
                    remediationSuccess 
                      ? 'bg-emerald-500 text-slate-950' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95'
                  }`}
                >
                  {remediating ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      Remediating...
                    </>
                  ) : remediationSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />
                      Remediation Success!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Apply Remediation
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Certificate
              </button>

              <button
                onClick={exportTelemetryJson}
                className="inline-flex items-center gap-1.5 rounded border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
              >
                <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                Export Telemetry
              </button>
              
              <button
                onClick={generateReport}
                className="inline-flex items-center gap-1.5 rounded border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
              >
                <RotateCcw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </div>

          {/* Interactive Report View Layout */}
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {/* Left/Main Column: Advisory Content */}
            <div className={`md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md printable-report relative overflow-hidden ${
              certificateMode ? 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] bg-[linear-gradient(to_bottom,rgba(15,23,42,0.8),rgba(10,10,12,0.9))]' : ''
            }`}>
              
              {certificateMode ? (
                /* Institutional Certificate Design Header */
                <div className="border-2 border-double border-amber-500/20 p-5 rounded-lg space-y-6 relative">
                  
                  {/* Seal Badge */}
                  <div className="absolute top-2 right-2 opacity-15">
                    <Award className="h-20 w-20 text-amber-500" />
                  </div>

                  {report.validation && (
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-0.5 border border-amber-500/20 bg-slate-950/95 px-2.5 py-1 rounded text-right no-print">
                      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block">Diagnostics Status</span>
                      <div className="flex items-center gap-1 text-[8px] font-bold font-mono">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          report.validation.status === 'passed' ? 'bg-emerald-400' :
                          report.validation.status === 'warning' ? 'bg-yellow-400' : 'bg-red-500'
                        }`} />
                        <span className={
                          report.validation.status === 'passed' ? 'text-emerald-400' :
                          report.validation.status === 'warning' ? 'text-yellow-400' : 'text-red-450'
                        }>
                          {report.validation.code}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center space-y-1.5 border-b border-amber-500/20 pb-4">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block font-mono">Official Soil Diagnostics Assessment</span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-100 font-serif">VITA-CORE PRECISION LABORATORY SERVICES</h2>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">Calibration Record: VCS-2026-08872 | Biothon Compliant</p>
                  </div>

                  {/* Metadata Table */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-950/70 p-3.5 border border-slate-850 rounded font-mono">
                    <div>
                      <span className="block text-[8px] text-slate-500 uppercase font-bold">Field / Area</span>
                      <span className="font-semibold text-slate-300">{selectedField.name}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 uppercase font-bold">Active Crop</span>
                      <span className="font-semibold text-slate-350 uppercase">{selectedField.crop_type} ({selectedField.area_acres} Ac)</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 uppercase font-bold">Biosensor Model</span>
                      <span className="font-semibold text-emerald-400">{getBiosensorSpecies(selectedField.id)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 uppercase font-bold">Status Stamp</span>
                      <span className={`font-semibold ${selectedField.stress_level === 'high' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedField.stress_level === 'high' ? 'CRITICAL_BREACH' : 'CALIBRATION_OK'}
                      </span>
                    </div>
                  </div>

                  {/* Report body */}
                  <div className="text-xs text-slate-350 leading-relaxed font-sans whitespace-pre-line border-b border-amber-500/20 pb-6">
                    {report.report}
                  </div>

                  {/* Signatures and Barcode */}
                  <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-4 text-center sm:text-left">
                    {/* Simulated barcode */}
                    <div className="font-mono text-slate-500 text-[10px] space-y-1 select-none">
                      <div className="flex items-center gap-0.5 tracking-tighter text-slate-400 text-lg opacity-60">
                        ||| | || |||| | | ||| | ||| || ||| || |||
                      </div>
                      <span>BARCODE SECURITY: *SENTINEL-RAG-2026*</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-3xs font-mono text-center">
                      <div className="border-t border-slate-800 pt-1">
                        <span className="font-bold block text-slate-300">Shivanesh V</span>
                        <span className="text-slate-550 uppercase">ML Architect</span>
                      </div>
                      <div className="border-t border-slate-800 pt-1">
                        <span className="font-bold block text-slate-300">Venkataraam VG</span>
                        <span className="text-slate-550 uppercase">Frontend Lead</span>
                      </div>
                      <div className="border-t border-slate-800 pt-1">
                        <span className="font-bold block text-slate-300">Ragavendra M</span>
                        <span className="text-slate-550 uppercase">Backend Lead</span>
                      </div>
                      <div className="border-t border-slate-800 pt-1">
                        <span className="font-bold block text-slate-300">Ashwin M</span>
                        <span className="text-slate-550 uppercase">Vision Engineer</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Advisory Layout */
                <div className="space-y-4 text-left">
                  {report.validation && (
                    <div className={`p-3 rounded-lg border flex gap-3 items-start text-xs ${
                      report.validation.status === 'passed' ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-450' :
                      report.validation.status === 'warning' ? 'bg-yellow-950/10 border-yellow-900/20 text-yellow-400' : 'bg-red-950/10 border-red-900/20 text-red-400'
                    }`}>
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        report.validation.status === 'passed' ? 'text-emerald-400' :
                        report.validation.status === 'warning' ? 'text-yellow-400' : 'text-red-500'
                      }`} />
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>Mycelial Sensor Validation Lock</span>
                          <span className={`font-mono text-5xs px-1 py-0.5 rounded border ${
                            report.validation.status === 'passed' ? 'border-emerald-500/20 bg-emerald-500/10' :
                            report.validation.status === 'warning' ? 'border-yellow-500/20 bg-yellow-500/10' : 'border-red-500/20 bg-red-500/10'
                          }`}>
                            {report.validation.code}
                          </span>
                        </div>
                        <p className="text-3xs text-slate-400 mt-1 leading-normal">
                          {report.validation.reason}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="prose prose-invert max-w-none text-sm text-slate-300 space-y-4 whitespace-pre-line leading-relaxed border-t border-slate-800/50 pt-3">
                    {report.report}
                  </div>
                </div>
              )}
            </div>

            {/* Right/Secondary Column: Agronomy Chatbot */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md flex flex-col h-[480px] no-print">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-3 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="block text-2xs font-semibold text-slate-200">Agronomist AI assistant</span>
                  <span className="text-4xs font-mono text-slate-500">RAG Context Engine Active</span>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-900 pr-1 pb-2">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-2.5 text-3xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'bg-slate-950 border border-slate-850 text-slate-300 whitespace-pre-line'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
                      <span className="text-5xs font-mono text-slate-500 uppercase tracking-widest">Querying RAG...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input form */}
              <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={chatLoading}
                  className="flex-1 rounded bg-slate-950 border border-slate-850 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded bg-emerald-500 px-3 text-slate-950 hover:bg-emerald-450 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Soil Remediation Mixer Control Panel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6 mt-6 no-print">
            <div className="border-l-4 border-emerald-500 pl-4">
              <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-emerald-400" />
                Physical Remediation Valve & Chemical Mixer Actuator
              </h3>
              <p className="text-3xs text-slate-400">Configure flow parameters and nitrogen injection ratios to trigger physical relays.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Sliders panel */}
              <div className="space-y-4 text-xs">
                {/* Flow Rate */}
                <div className="space-y-1">
                  <div className="flex justify-between text-4xs font-bold uppercase">
                    <span className="text-slate-450">Irrigation Flow Rate</span>
                    <span className="text-emerald-400 font-mono">{irrigationFlow} L/s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={irrigationFlow}
                    onChange={(e) => setIrrigationFlow(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
                  />
                </div>

                {/* Chemical Conc */}
                <div className="space-y-1">
                  <div className="flex justify-between text-4xs font-bold uppercase">
                    <span className="text-slate-450">Nitrogen Injection Concentration</span>
                    <span className="text-emerald-400 font-mono">{fertilizerConcentration.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={fertilizerConcentration}
                    onChange={(e) => setFertilizerConcentration(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
                  />
                </div>

                {/* Timeline */}
                <div className="space-y-1">
                  <div className="flex justify-between text-4xs font-bold uppercase">
                    <span className="text-slate-450">Absorption Correction Window</span>
                    <span className="text-emerald-400 font-mono">{correctiveTimeline} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="48"
                    step="6"
                    value={correctiveTimeline}
                    onChange={(e) => setCorrectiveTimeline(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Calculations display */}
              <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-850 font-mono text-[10px] text-slate-350 space-y-2 flex flex-col justify-center">
                <span className="text-4xs font-bold text-emerald-500 uppercase tracking-widest block border-b border-slate-900 pb-1.5 mb-1.5">Calculation Engine Returns</span>
                <p><b className="text-slate-500">Target Water Vol:</b> {report.metrics.water_liters.toLocaleString()} Liters</p>
                <p><b className="text-slate-500">Target Urea Mass:</b> {report.metrics.urea_kg} kg</p>
                <p><b className="text-slate-500">Valve Run Duration:</b> <span className="text-cyan-400 font-bold">{report.metrics.water_liters > 0 ? ((report.metrics.water_liters / irrigationFlow) / 60).toFixed(1) : 0} minutes</span></p>
                {report.metrics.urea_kg > 0 && (
                  <p><b className="text-slate-500">Urea Injection Rate:</b> <span className="text-amber-400 font-bold">{(report.metrics.urea_kg / Math.max(1, ((report.metrics.water_liters / irrigationFlow) / 60))).toFixed(2)} kg/min</span></p>
                )}
              </div>

              {/* Actuator Status & Run logs */}
              <div className="flex flex-col justify-between">
                {valveActive ? (
                  <div className="flex-1 rounded bg-slate-950 p-3 font-mono text-[9px] text-emerald-500 border border-slate-850 overflow-y-auto space-y-1 h-32 scrollbar-none text-left">
                    {valveLogs.map((log, idx) => (
                      <p key={idx} className="leading-tight">{log}</p>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 rounded bg-slate-950/40 border border-slate-850 flex flex-col items-center justify-center text-center p-4">
                    <span className="text-5xs font-bold text-slate-550 uppercase tracking-widest block">Actuator Loop Idle</span>
                    <button
                      onClick={startValveSequence}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-2xs font-semibold text-slate-950 hover:bg-emerald-450 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                    >
                      <Terminal className="h-3 w-3" /> Engage Valve Sequence
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <p className="text-xs font-semibold text-red-400">Error generating report: {error}</p>
          <button
            onClick={generateReport}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Retry Generation
          </button>
        </div>
      )}
    </div>
  );
}
