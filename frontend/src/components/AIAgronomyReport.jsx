import React, { useState } from 'react';
import { Sparkles, Terminal, FileText, Droplet, FlaskConical, CornerDownRight, CheckCircle2, RotateCcw, Printer } from 'lucide-react';

export default function AIAgronomyReport({ selectedField, backendUrl, onRemediationApplied }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [remediating, setRemediating] = useState(false);
  const [remediationSuccess, setRemediationSuccess] = useState(false);

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

    try {
      // Simulate RAG steps in logs
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

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
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

      {/* Report Showcase */}
      {report && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Markdown Report Container */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md printable-report">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4 mb-6 no-print">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-slate-200">Agronomy Advisory Report</h3>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {selectedField.stress_level !== 'low' && (
                  <button
                    onClick={applyRemediation}
                    disabled={remediating || remediationSuccess}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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
                        Apply Automated Remediation
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Report
                </button>
                <button
                  onClick={generateReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
                >
                  <RotateCcw className="h-3 w-3" />
                  Recalculate
                </button>
              </div>
            </div>
            
            {/* Display Markdown parsed or cleanly aligned text */}
            <div className="prose prose-invert max-w-none text-sm text-slate-300 space-y-4 whitespace-pre-line leading-relaxed">
              {report.report}
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-400">Error generating report: {error}</p>
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
