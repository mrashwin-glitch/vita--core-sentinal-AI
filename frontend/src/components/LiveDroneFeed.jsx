import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

export default function LiveDroneFeed() {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);

  useEffect(() => {
    // Request access to the webcam to simulate the drone's optical payload
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
          setStreamError(null);
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setStreamError("Unable to access local camera source. Check permission logs.");
      }
    };

    startCamera();

    // Cleanup camera when you close the tab
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        let tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Live Optical Uplink</h2>
        <p className="text-sm text-slate-400">Continuous live camera feeds simulating real-time drone payload computer vision streams.</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-emerald-400 font-semibold flex items-center gap-2 text-sm tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]"></span>
            LIVE OPTICAL UPLINK (DRONE SIMULATION)
          </h3>
          <span className="text-2xs text-slate-400 font-mono tracking-wider border border-slate-700 px-2 py-0.5 rounded bg-slate-950">
            WEBRTC BRIDGE
          </span>
        </div>

        {/* Camera Feed Container */}
        <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden border border-emerald-500/30">
          
          {/* The live webcam feed with Night-Vision / Bioluminescent Styling applied */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover opacity-80 filter sepia hue-rotate-60 contrast-125 brightness-75 saturate-150"
          />

          {/* Drone HUD Overlay */}
          {isStreaming ? (
            <div className="absolute inset-0 pointer-events-none">
              {/* Center Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-[1.5px] border-emerald-500/40 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]"></div>
                <div className="absolute top-0 w-0.5 h-4 bg-emerald-500/40 -translate-y-full"></div>
                <div className="absolute bottom-0 w-0.5 h-4 bg-emerald-500/40 translate-y-full"></div>
                <div className="absolute left-0 w-4 h-0.5 bg-emerald-500/40 -translate-x-full"></div>
                <div className="absolute right-0 w-4 h-0.5 bg-emerald-500/40 translate-x-full"></div>
              </div>
              
              {/* Corner Target Brackets */}
              <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-emerald-500/60"></div>
              <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-emerald-500/60"></div>
              <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-emerald-500/60"></div>
              <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-emerald-500/60"></div>

              {/* Top Right: Telemetry */}
              <div className="absolute top-8 right-8 text-emerald-400 font-mono text-3xs text-right bg-slate-950/70 p-2 rounded border border-emerald-500/25 backdrop-blur-sm space-y-0.5">
                  <p>ALT: 45.2m AGL</p>
                  <p>SPD: 12.4 km/h</p>
                  <p>GPS: LOCKED (12.9716, 80.1846)</p>
                  <p>BAT: 78% [14.2V]</p>
              </div>

              {/* Bottom Left: System Status */}
              <div className="absolute bottom-8 left-8 text-emerald-400 font-mono text-3xs bg-slate-950/70 p-2 rounded border border-emerald-500/25 backdrop-blur-sm space-y-0.5">
                <p className="animate-pulse">OPENCV MASKING: ACTIVE</p>
                <p>TARGET: MYCELIAL_GLOW</p>
                <p className="text-cyan-400 font-bold">CNN INFERENCE: REAL-TIME</p>
                <p className="text-slate-400">FRAME RATIO: 128x128 @ 30FPS</p>
              </div>
            </div>
          ) : streamError ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 font-mono text-xs p-6 text-center space-y-2">
                 <Camera className="h-8 w-8 text-red-500 animate-bounce" />
                 <p className="font-bold">{streamError}</p>
                 <p className="text-slate-500 max-w-sm text-3xs">Ensure you have approved camera permissions when requested by the browser.</p>
             </div>
          ) : (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500 font-mono text-xs space-y-3">
                 <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                 <p className="animate-pulse">ESTABLISHING SECURE UPLINK BRIDGE...</p>
             </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h4 className="text-xs font-semibold text-slate-350 uppercase tracking-wider mb-2">WebRTC & RTMP Stream Details</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Sentinel interfaces directly with standard RTSP/RTMP drone transmitters. The video payload is transcoded into a WebRTC H.264 video feed for client-side ingestion, allowing OpenCV masking and CNN regression predictions to execute dynamically on the video frames.
        </p>
      </div>
    </div>
  );
}
