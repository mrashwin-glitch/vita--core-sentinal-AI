import React, { useState, useEffect } from 'react';
import { Activity, Bell, Smartphone, ShieldAlert, CheckCircle, BarChart3, UploadCloud, Map, Sparkles, UserCheck, Camera, Settings, Sliders, Orbit, Landmark, BookOpen } from 'lucide-react';
import Heatmap from './Heatmap';
import GlowVisualizer from './GlowVisualizer';
import LiveDroneFeed from './LiveDroneFeed';
import PredictiveAnalytics from './PredictiveAnalytics';
import AIAgronomyReport from './AIAgronomyReport';
import TeamInfo from './TeamInfo';
import LuminescenceSpectrometry from './LuminescenceSpectrometry';
import BioEconomicLedger from './BioEconomicLedger';
import ScientificLibrary from './ScientificLibrary';

export default function Dashboard({ backendUrl, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const [sectors, setSectors] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(3);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [importedImage, setImportedImage] = useState(null);
  const [thresholds, setThresholds] = useState({
    rice: { minN: 120, minM: 70, minPh: 6.0, maxPh: 7.0 },
    wheat: { minN: 140, minM: 45, minPh: 6.0, maxPh: 7.5 },
    maize: { minN: 150, minM: 55, minPh: 5.8, maxPh: 7.0 }
  });

  // Derived selected field based on active ID
  const selectedField = sectors.find(s => s.id === selectedFieldId) || sectors[0];
  const setSelectedField = (field) => {
    if (field && field.id) {
      setSelectedFieldId(field.id);
    }
  };

  // Fetch all sectors and alerts from backend
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': token ? `Bearer ${token}` : '' };

      const [sectorsRes, alertsRes, historyRes] = await Promise.all([
        fetch(`${backendUrl}/api/analytics/heatmap`, { headers }),
        fetch(`${backendUrl}/api/alerts`, { headers }),
        fetch(`${backendUrl}/api/analytics/history`, { headers })
      ]);

      const sectorsData = await sectorsRes.json();
      const alertsData = await alertsRes.json();
      const historyData = await historyRes.json();

      setSectors(sectorsData);
      setAlerts(alertsData);
      setHistory(historyData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh stats every 8 seconds for real-time feel
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Read all alerts handler
  const markAlertsAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${backendUrl}/api/alerts/read`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !selectedField) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
          <p className="text-xs font-mono tracking-widest text-slate-400">LOADING SENTINEL CORRELATION TELEMETRY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-slate-100 via-slate-250 to-emerald-400 bg-clip-text text-transparent">
                VITA-CORE SENTINEL AI
              </h1>
              <p className="text-5xs font-mono text-emerald-500 uppercase tracking-widest">Mycelial Optical Bio-Sensor Pipeline</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Alerts Bell */}
            <div className="relative group cursor-pointer" onClick={markAlertsAsRead}>
              <Bell className="h-5 w-5 text-slate-400 hover:text-slate-100 transition-colors" />
              {alerts.filter(a => a.read_status === 0).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-3xs font-bold text-slate-100 animate-pulse">
                  {alerts.filter(a => a.read_status === 0).length}
                </span>
              )}
            </div>

            {/* Threshold Settings */}
            <div className="cursor-pointer" onClick={() => setShowSettingsModal(true)}>
              <Settings className="h-5 w-5 text-slate-400 hover:text-slate-100 transition-colors" />
            </div>

            <button
              onClick={onLogout}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-semibold text-slate-350 hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation & SMS Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Navigation Links */}
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 space-y-1">
            <span className="text-4xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 block">Sentinel Modules</span>
            
            <button
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'map' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Map className="h-4 w-4" />
              Geospatial Heatmap
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'upload' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-205 hover:bg-slate-900/50'
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              Glow Interpreter (CNN)
            </button>

            <button
              onClick={() => setActiveTab('live-feed')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'live-feed' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-205 hover:bg-slate-900/50'
              }`}
            >
              <Camera className="h-4 w-4" />
              Live Drone Uplink
            </button>

            <button
              onClick={() => setActiveTab('predictive')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'predictive' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Predictive Analytics
            </button>

            <button
              onClick={() => setActiveTab('agronomy')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'agronomy' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Agronomy Advisor
            </button>

            <button
              onClick={() => setActiveTab('spectrometry')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'spectrometry' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Sensor Validation & Calibration
            </button>

            <button
              onClick={() => setActiveTab('economic-ledger')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'economic-ledger' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Landmark className="h-4 w-4" />
              Carbon & Subsidy Ledger
            </button>

             <button
              onClick={() => setActiveTab('scientific-library')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scientific-library' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Scientific Library
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'team' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Team & Compliance
            </button>
          </div>

          {/* SMS Logs Monitor */}
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 flex flex-col h-80">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-3">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="block text-2xs font-semibold text-slate-200">SMS Gateway Logs</span>
                <span className="text-4xs font-mono text-slate-500">Live Cellular Transmission</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-900">
              {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-600">
                  <Smartphone className="h-6 w-6 mb-1 text-slate-700" />
                  <span className="text-4xs uppercase font-bold tracking-wider">No Dispatches Logged</span>
                </div>
              ) : (
                alerts.map((alert, idx) => (
                  <div key={idx} className="rounded border border-slate-900 bg-slate-950 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-4xs font-bold text-slate-400 border border-slate-850">
                        <Smartphone className="h-2.5 w-2.5 text-emerald-400" /> SMS Dispatched
                      </span>
                      <span className="text-4xs font-mono text-slate-500">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-3xs text-slate-350 leading-relaxed font-sans">{alert.message}</p>
                    <span className="block text-5xs font-mono text-emerald-500/80">Recip: {alert.phone_number}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Center Work Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
            
            {/* Stress widget */}
            <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between">
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Sector Stress Index</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block h-3.5 w-3.5 rounded-full ${
                  selectedField.stress_level === 'high' ? 'bg-red-500 animate-ping' :
                  selectedField.stress_level === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                }`} />
                <span className={`text-md font-extrabold capitalize ${
                  selectedField.stress_level === 'high' ? 'text-red-400' :
                  selectedField.stress_level === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {selectedField.stress_level || 'No Data'}
                </span>
              </div>
              <span className="text-4xs text-slate-500 mt-2 block">Crop: {selectedField.crop_type.toUpperCase()}</span>
            </div>

            {/* Nitrogen widget */}
            <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between">
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Avg Nitrogen (N)</span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-slate-100">
                  {selectedField.nitrogen_val !== null ? `${selectedField.nitrogen_val}` : '--'}
                </span>
                <span className="text-4xs text-slate-500 font-sans ml-1">mg/kg</span>
              </div>
              <span className="text-4xs text-slate-500 mt-2 block">Target min: {thresholds[selectedField.crop_type]?.minN || 150}</span>
            </div>

            {/* Moisture widget */}
            <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between">
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Soil Moisture</span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-slate-100">
                  {selectedField.moisture_val !== null ? `${selectedField.moisture_val}%` : '--'}
                </span>
              </div>
              <span className="text-4xs text-slate-500 mt-2 block">Target min: {thresholds[selectedField.crop_type]?.minM || 55}%</span>
            </div>

            {/* pH widget */}
            <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between">
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Soil Acidity (pH)</span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-slate-100">
                  {selectedField.ph_val !== null ? `${selectedField.ph_val}` : '--'}
                </span>
              </div>
              <span className="text-4xs text-slate-500 mt-2 block">Target pH: {thresholds[selectedField.crop_type]?.minPh || 6.0} - {thresholds[selectedField.crop_type]?.maxPh || 7.2}</span>
            </div>

          </div>

          {/* Dynamic Tab Panels */}
          <div className="min-h-[400px]">
            {activeTab === 'map' && (
              <Heatmap 
                sectors={sectors} 
                selectedField={selectedField} 
                setSelectedField={setSelectedField} 
              />
            )}
            
            {activeTab === 'upload' && (
              <GlowVisualizer 
                selectedField={selectedField} 
                backendUrl={backendUrl}
                onAnalysisSuccess={fetchData}
                importedImage={importedImage}
                setImportedImage={setImportedImage}
              />
            )}

            {activeTab === 'live-feed' && (
              <LiveDroneFeed 
                setActiveTab={setActiveTab}
                setImportedImage={setImportedImage}
                selectedField={selectedField}
              />
            )}

            {activeTab === 'predictive' && (
              <PredictiveAnalytics 
                selectedField={selectedField}
                historyData={history}
                thresholds={thresholds}
              />
            )}

            {activeTab === 'agronomy' && (
              <AIAgronomyReport 
                selectedField={selectedField}
                backendUrl={backendUrl}
                onRemediationApplied={fetchData}
              />
            )}

            {activeTab === 'spectrometry' && (
              <LuminescenceSpectrometry
                selectedField={selectedField}
                backendUrl={backendUrl}
                onCalibrationSaved={fetchData}
              />
            )}

            {activeTab === 'economic-ledger' && (
              <BioEconomicLedger selectedField={selectedField} />
            )}

            {activeTab === 'scientific-library' && (
              <ScientificLibrary />
            )}

            {activeTab === 'team' && (
              <TeamInfo />
            )}
          </div>
        </div>

      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative">
            <h3 className="text-md font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-emerald-400" />
              Configure Alert Thresholds
            </h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {Object.keys(thresholds).map((crop) => (
                <div key={crop} className="rounded-lg bg-slate-950 p-3 border border-slate-850 space-y-3">
                  <span className="block text-2xs font-bold text-emerald-400 uppercase tracking-wider">{crop.toUpperCase()} Target Metrics</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-5xs font-bold text-slate-500 uppercase tracking-wider block">Min Nitrogen (mg/kg)</label>
                      <input
                        type="number"
                        value={thresholds[crop].minN}
                        onChange={(e) => setThresholds({
                          ...thresholds,
                          [crop]: { ...thresholds[crop], minN: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full mt-1 rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-5xs font-bold text-slate-500 uppercase tracking-wider block">Min Moisture (%)</label>
                      <input
                        type="number"
                        value={thresholds[crop].minM}
                        onChange={(e) => setThresholds({
                          ...thresholds,
                          [crop]: { ...thresholds[crop], minM: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full mt-1 rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-5xs font-bold text-slate-500 uppercase tracking-wider block">Min pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={thresholds[crop].minPh}
                        onChange={(e) => setThresholds({
                          ...thresholds,
                          [crop]: { ...thresholds[crop], minPh: parseFloat(e.target.value) || 0.0 }
                        })}
                        className="w-full mt-1 rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-5xs font-bold text-slate-500 uppercase tracking-wider block">Max pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={thresholds[crop].maxPh}
                        onChange={(e) => setThresholds({
                          ...thresholds,
                          [crop]: { ...thresholds[crop], maxPh: parseFloat(e.target.value) || 0.0 }
                        })}
                        className="w-full mt-1 rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-440 transition-colors"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-4xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Vita-Core Systems. All rights reserved. Precision Software-Driven Soil Metrics.</p>
      </footer>
    </div>
  );
}
