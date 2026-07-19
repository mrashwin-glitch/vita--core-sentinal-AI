import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Play, CircleDot, Info, CheckCircle2, Navigation } from 'lucide-react';

export default function LiveDroneFeed({ setActiveTab, setImportedImage, selectedField }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);

  // Flight states
  const [missionState, setMissionState] = useState('IDLE'); // IDLE, PREFLIGHT, TAKEOFF, NAVIGATING, SCANNING, COMPLETE
  const [flightLogs, setFlightLogs] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentWaypoint, setCurrentWaypoint] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);

  // Simulated HUD variables for 60 FPS canvas rendering
  const telemetryRef = useRef({
    pitch: 0,
    roll: 0,
    heading: 90,
    altitude: 0,
    speed: 0,
    lat: 12.9716,
    lng: 80.1846
  });

  useEffect(() => {
    // Request webcam access for drone feed simulation
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
          setStreamError(null);
        }
      } catch (err) {
        console.error("Camera access blocked: ", err);
        setStreamError("Unable to access local camera source. Check permission logs.");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // 60 FPS HUD Drawing Loop
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawHUD = () => {
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (!isStreaming) {
        animId = requestAnimationFrame(drawHUD);
        return;
      }

      const tel = telemetryRef.current;

      // Color Theme: Neon Cyber Emerald
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.font = '10px monospace';

      // 1. Crosshair in center
      const cx = w / 2;
      const cy = h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
      ctx.moveTo(cx - 25, cy); ctx.lineTo(cx - 10, cy);
      ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 25, cy);
      ctx.moveTo(cx, cy - 25); ctx.lineTo(cx, cy - 10);
      ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 25);
      ctx.stroke();

      // 2. Artificial Horizon Ladder (Pitch / Roll)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((tel.roll * Math.PI) / 180);
      
      const pitchOffset = tel.pitch * 3; // 3 pixels per degree
      ctx.beginPath();
      // Draw horizon line
      ctx.moveTo(-60, pitchOffset);
      ctx.lineTo(60, pitchOffset);
      
      // Draw Pitch bars
      for (let p = -30; p <= 30; p += 10) {
        if (p === 0) continue;
        const y = pitchOffset - (p * 3);
        ctx.moveTo(-30, y); ctx.lineTo(30, y);
        // ticks at the ends
        ctx.moveTo(-30, y); ctx.lineTo(-30, y + (p > 0 ? 5 : -5));
        ctx.moveTo(30, y); ctx.lineTo(30, y + (p > 0 ? 5 : -5));
        ctx.fillText(`${Math.abs(p)}°`, 38, y + 3);
        ctx.fillText(`${Math.abs(p)}°`, -58, y + 3);
      }
      ctx.stroke();
      ctx.restore();

      // 3. Roll Indicator Arc (Top Center)
      ctx.beginPath();
      ctx.arc(cx, cy, 120, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      // Roll pointer
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((tel.roll * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -120);
      ctx.lineTo(-5, -112);
      ctx.lineTo(5, -112);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. Airspeed Tape (Left side)
      const speedY = cy;
      ctx.beginPath();
      ctx.moveTo(45, cy - 80);
      ctx.lineTo(45, cy + 80);
      ctx.stroke();
      // Ticks and numbers
      for (let s = Math.max(0, Math.floor(tel.speed - 15)); s <= tel.speed + 15; s++) {
        if (s % 5 === 0) {
          const diff = s - tel.speed;
          const y = speedY - (diff * 5);
          if (y >= cy - 80 && y <= cy + 80) {
            ctx.beginPath();
            ctx.moveTo(35, y);
            ctx.lineTo(45, y);
            ctx.stroke();
            ctx.fillText(s.toString(), 18, y + 3);
          }
        }
      }
      // Speed box readout
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(5, cy - 8, 38, 16);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(5, cy - 8, 38, 16);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${tel.speed.toFixed(1)}k`, 8, cy + 4);

      // 5. Altimeter Tape (Right side)
      ctx.font = '10px monospace';
      const altY = cy;
      ctx.beginPath();
      ctx.moveTo(w - 45, cy - 80);
      ctx.lineTo(w - 45, cy + 80);
      ctx.stroke();
      // Ticks and numbers
      for (let a = Math.max(0, Math.floor(tel.altitude - 10)); a <= tel.altitude + 10; a++) {
        if (a % 2 === 0) {
          const diff = a - tel.altitude;
          const y = altY - (diff * 7);
          if (y >= cy - 80 && y <= cy + 80) {
            ctx.beginPath();
            ctx.moveTo(w - 45, y);
            ctx.lineTo(w - 35, y);
            ctx.stroke();
            ctx.fillText(a.toString(), w - 30, y + 3);
          }
        }
      }
      // Altitude box readout
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(w - 43, cy - 8, 38, 16);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(w - 43, cy - 8, 38, 16);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${tel.altitude.toFixed(1)}m`, w - 40, cy + 4);

      // 6. Compass Tape (Top)
      ctx.font = '9px monospace';
      ctx.beginPath();
      ctx.moveTo(cx - 100, 20);
      ctx.lineTo(cx + 100, 20);
      ctx.stroke();
      for (let hDeg = tel.heading - 30; hDeg <= tel.heading + 30; hDeg++) {
        const normH = (hDeg + 360) % 360;
        if (normH % 5 === 0) {
          const diff = hDeg - tel.heading;
          const x = cx + (diff * 3);
          if (x >= cx - 100 && x <= cx + 100) {
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, normH % 15 === 0 ? 12 : 16);
            ctx.stroke();
            if (normH % 15 === 0) {
              let label = normH.toString();
              if (normH === 0) label = 'N';
              else if (normH === 90) label = 'E';
              else if (normH === 180) label = 'S';
              else if (normH === 270) label = 'W';
              ctx.fillText(label, x - 4, 10);
            }
          }
        }
      }
      // center heading tick marker
      ctx.beginPath();
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx - 4, 25);
      ctx.lineTo(cx + 4, 25);
      ctx.closePath();
      ctx.fillStyle = '#10b981';
      ctx.fill();

      // 7. Corner Brackets
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(20, 30, w - 40, h - 50);

      // Request next frame
      animId = requestAnimationFrame(drawHUD);
    };

    drawHUD();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isStreaming]);

  const addFlightLog = (msg) => {
    setFlightLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runFlightMission = async () => {
    setMissionState('PREFLIGHT');
    setFlightLogs([]);
    setScanProgress(0);
    setCapturedSnapshot(null);

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const tel = telemetryRef.current;

    // Simulate pre-flight
    addFlightLog("SYS: Initiating pre-flight diagnostic checklist...");
    await wait(800);
    addFlightLog("SYS: ESC motor telemetry calibration - PASSED");
    addFlightLog("SYS: IMU & magnetic compass alignment - LOCKED");
    addFlightLog("SYS: GPS lock established (12.9716, 80.1846)");
    addFlightLog("SYS: Battery level 94% [16.8V] - STABLE");
    
    // Takeoff
    setMissionState('TAKEOFF');
    addFlightLog("NAV: Propellers active. Initiating autonomous takeoff...");
    
    // Animate takeoff variables
    for (let alt = 0; alt <= 45; alt += 5) {
      tel.altitude = alt;
      tel.pitch = 8; // pitch up during climb
      tel.roll = Math.sin(alt) * 3;
      tel.heading = 90 + Math.sin(alt) * 5;
      await wait(100);
    }
    tel.pitch = 0;
    tel.roll = 0;
    addFlightLog("NAV: Hover altitude 45m AGL achieved. Position holding...");
    await wait(400);
    
    // Navigating
    setMissionState('NAVIGATING');
    setCurrentWaypoint(selectedField.name);
    addFlightLog(`NAV: Navigating to waypoint: ${selectedField.name}...`);
    
    // Simulate flight movement
    for (let i = 0; i <= 20; i++) {
      tel.speed = 10 + Math.sin(i) * 15;
      tel.pitch = -4; // pitch down for forward flight
      tel.roll = Math.cos(i) * 5;
      tel.heading = (90 + i * 2) % 360;
      tel.lat += 0.0001;
      tel.lng += 0.0002;
      await wait(100);
    }
    tel.speed = 0;
    tel.pitch = 0;
    tel.roll = 0;
    
    // Scanning
    setMissionState('SCANNING');
    addFlightLog("CAM: Target waypoint reached. Initiating optical sensor alignment...");
    
    // Simulate scan bar progress
    for (let p = 0; p <= 100; p += 20) {
      setScanProgress(p);
      tel.pitch = Math.sin(p) * 2;
      tel.roll = Math.cos(p) * 1.5;
      addFlightLog(`CAM: Executing bioluminescence ribbon wavelength scanning... ${p}%`);
      await wait(400);
    }
    tel.pitch = 0;
    tel.roll = 0;
    addFlightLog("CAM: Green fluorescence wavelength scan (~522nm) - COMPLETE");

    // Select the preset image based on selected field condition
    let presetFile = 'test_glow_all_lanes_1.png';
    if (selectedField.id === 3) {
      presetFile = 'test_glow_low_moisture.png';
    } else if (selectedField.id === 2) {
      presetFile = 'test_glow_low_nitrogen.png';
    } else if (selectedField.id === 1) {
      presetFile = 'test_glow_blue_rows.png';
    }

    setCapturedSnapshot(presetFile);
    addFlightLog(`SYS: Glow image snapshot captured: ${presetFile}`);
    addFlightLog("NAV: Returning to launch point (RTL)...");
    
    // Return to land animation
    tel.speed = 15;
    await wait(600);
    tel.speed = 0;
    for (let alt = 45; alt >= 0; alt -= 5) {
      tel.altitude = alt;
      tel.pitch = -2;
      await wait(100);
    }
    tel.pitch = 0;
    
    addFlightLog("NAV: Landing sequence complete. Motors inactive.");
    setMissionState('COMPLETE');
    setCurrentWaypoint(null);
  };

  const importToInterpreter = () => {
    if (capturedSnapshot) {
      setImportedImage({ preset: capturedSnapshot });
      setActiveTab('upload');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Live Optical Uplink</h2>
        <p className="text-sm text-slate-400">Continuous live camera feeds simulating real-time drone payload computer vision streams.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Drone Camera Stream with Overlaid HUD Canvas */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-emerald-400 font-semibold flex items-center gap-2 text-sm tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]"></span>
              LIVE OPTICAL UPLINK (DRONE COCKPIT SIMULATOR)
            </h3>
            <span className="text-2xs text-slate-400 font-mono tracking-wider border border-slate-700 px-2 py-0.5 rounded bg-slate-950">
              WEBRTC BRIDGE
            </span>
          </div>

          <div className="relative w-full h-[360px] bg-black rounded-lg overflow-hidden border border-emerald-500/30">
            {/* Camera Video Stream */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover opacity-80 filter sepia hue-rotate-60 contrast-125 brightness-75 saturate-150"
            />

            {/* Overlaid transparent 60fps HUD Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* HUD Status box fallback when stream isn't working */}
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500 font-mono text-xs space-y-3 bg-black">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                <p className="animate-pulse">ESTABLISHING SECURE UPLINK BRIDGE...</p>
              </div>
            )}
          </div>
        </div>

        {/* Autopilot Controller Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md flex flex-col justify-between h-[440px]">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-400" />
              Autopilot mission
            </h3>

            {missionState === 'IDLE' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-slate-950/60 border border-slate-850">
                <CircleDot className="h-10 w-10 text-slate-650 animate-pulse mb-3" />
                <h4 className="text-xs font-bold text-slate-300 uppercase">Autopilot Inactive</h4>
                <p className="text-4xs text-slate-500 mt-1 max-w-[200px]">
                  Initiate flight mission to navigate to {selectedField.name} and scan mycelial glow.
                </p>
                <button
                  onClick={runFlightMission}
                  className="mt-4 inline-flex items-center gap-1.5 rounded bg-emerald-500 px-4 py-2 text-2xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  <Play className="h-3 w-3" /> Launch Mission
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Console Log */}
                <div className="flex-1 rounded bg-slate-950 p-3 font-mono text-5xs text-emerald-500 border border-slate-850 overflow-y-auto space-y-1">
                  {flightLogs.map((log, idx) => (
                    <p key={idx} className="leading-tight">{log}</p>
                  ))}
                  {missionState !== 'COMPLETE' && (
                    <p className="animate-pulse text-slate-400 mt-1">Executing autopilot script...</p>
                  )}
                </div>

                {/* Progress bar */}
                {missionState === 'SCANNING' && (
                  <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-850">
                    <div className="flex justify-between text-5xs text-slate-400 font-bold uppercase">
                      <span>Wavelength scan progress</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Captured Snapshot Dialog */}
          {missionState === 'COMPLETE' && capturedSnapshot && (
            <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/20 space-y-2 animate-fadeIn">
              <span className="block text-4xs font-bold text-slate-400 uppercase tracking-wider text-center">Glow Snapshot Captured</span>
              <div className="relative aspect-video max-h-[80px] mx-auto rounded overflow-hidden border border-slate-800 bg-black">
                <img src={`/presets/${capturedSnapshot}`} alt="Drone Scan Snapshot" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={importToInterpreter}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-emerald-500 py-1.5 text-3xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Camera className="h-3 w-3" /> Ingest in Glow Interpreter
              </button>
            </div>
          )}

          <div className="rounded bg-slate-950/60 p-2 text-5xs text-slate-500 leading-relaxed border border-slate-850 flex gap-2">
            <Info className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              Auto-Flight scripts control pitch/roll/yaw via telemetry commands. The HUD displays real-time altimeter speed tape loops at 60 FPS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
