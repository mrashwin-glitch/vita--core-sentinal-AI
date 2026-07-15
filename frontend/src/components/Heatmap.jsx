import React from 'react';
import { Layers, MapPin, Activity, HelpCircle } from 'lucide-react';

export default function Heatmap({ sectors, selectedField, setSelectedField }) {
  // Map stress level to CSS classes for SVG sectors
  const getSectorStyle = (stress) => {
    switch (stress) {
      case 'high':
        return {
          fill: 'rgba(239, 68, 68, 0.15)',
          stroke: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.4)',
          text: 'text-red-400',
          bg: 'bg-red-500/10'
        };
      case 'medium':
        return {
          fill: 'rgba(234, 179, 8, 0.15)',
          stroke: '#eab308',
          glow: 'rgba(234, 179, 8, 0.3)',
          text: 'text-yellow-400',
          bg: 'bg-yellow-500/10'
        };
      default:
        return {
          fill: 'rgba(16, 185, 129, 0.15)',
          stroke: '#10b981',
          glow: 'rgba(16, 185, 129, 0.3)',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10'
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Autonomous Heat-Map</h2>
        <p className="text-sm text-slate-400">Real-time geospatial heatmaps showing bioluminescent nitrogen & moisture returns.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* SVG Interactive Farm Map */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
            <h3 className="text-md font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Geospatial Sector View
            </h3>
            <span className="inline-flex items-center gap-1 rounded bg-slate-950 px-2 py-1 text-2xs font-semibold text-slate-400 border border-slate-850">
              <MapPin className="h-3 w-3 text-emerald-400" /> GPS Locked
            </span>
          </div>

          {/* Interactive SVG Grid */}
          <div className="relative aspect-video w-full rounded-lg bg-slate-950/80 p-4 border border-slate-900 overflow-hidden flex items-center justify-center">
            {/* Background radar grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
            
            <svg viewBox="0 0 800 450" className="w-full h-full relative z-10 select-none">
              {/* Roads / Field dividers */}
              <line x1="400" y1="20" x2="400" y2="430" stroke="#1e293b" strokeWidth="6" strokeDasharray="5 5" />
              <line x1="20" y1="225" x2="780" y2="225" stroke="#1e293b" strokeWidth="6" strokeDasharray="5 5" />
              
              {sectors.map((sector) => {
                const style = getSectorStyle(sector.stress_level);
                const isSelected = selectedField.id === sector.id;
                
                // Define coordinates for the 4 sectors
                // 1: North-West, 2: South-East, 3: North-East, 4: South-West
                let points = "";
                let cx = 0, cy = 0;
                
                if (sector.id === 1) {
                  points = "40,40 380,40 380,205 40,205";
                  cx = 210; cy = 120;
                } else if (sector.id === 3) {
                  points = "420,40 760,40 760,205 420,205";
                  cx = 590; cy = 120;
                } else if (sector.id === 4) {
                  points = "40,245 380,245 380,410 40,410";
                  cx = 210; cy = 330;
                } else { // sector 2
                  points = "420,245 760,245 760,410 420,410";
                  cx = 590; cy = 330;
                }

                return (
                  <g 
                    key={sector.id} 
                    onClick={() => setSelectedField(sector)}
                    className="cursor-pointer group"
                  >
                    {/* Shadow filter glow for selected sector */}
                    {isSelected && (
                      <polygon
                        points={points}
                        fill="transparent"
                        stroke={style.stroke}
                        strokeWidth="10"
                        className="opacity-25 blur-sm"
                      />
                    )}
                    
                    {/* Sector Shape */}
                    <polygon
                      points={points}
                      fill={style.fill}
                      stroke={isSelected ? '#f43f5e' : style.stroke}
                      strokeWidth={isSelected ? "3" : "1.5"}
                      className="transition-all duration-300 group-hover:fill-opacity-30"
                    />

                    {/* Sector Title Label */}
                    <text
                      x={cx}
                      y={cy - 15}
                      textAnchor="middle"
                      fill={isSelected ? '#f43f5e' : '#f8fafc'}
                      className="text-sm font-bold font-sans tracking-wide transition-colors duration-200"
                    >
                      {sector.name.split(' ')[0]} {sector.name.split(' ')[1] || ''}
                    </text>

                    {/* Crop Type Label */}
                    <text
                      x={cx}
                      y={cy + 10}
                      textAnchor="middle"
                      fill="#94a3b8"
                      className="text-xs font-sans uppercase font-medium tracking-wider"
                    >
                      {sector.crop_type} ({sector.area_acres} Ac)
                    </text>

                    {/* Simple stats overlays inside SVG */}
                    {sector.nitrogen_val !== null ? (
                      <text
                        x={cx}
                        y={cy + 30}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        className="text-2xs font-mono font-medium"
                      >
                        N: {sector.nitrogen_val} | M: {sector.moisture_val}%
                      </text>
                    ) : (
                      <text
                        x={cx}
                        y={cy + 30}
                        textAnchor="middle"
                        fill="#64748b"
                        className="text-2xs font-sans font-medium italic"
                      >
                        No Sensor Data
                      </text>
                    )}

                    {/* Pulsing Target Locator */}
                    {isSelected && (
                      <g className="pointer-events-none">
                        <circle
                          cx={cx}
                          cy={cy}
                          r="45"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="1.5"
                          className="opacity-70 animate-ping"
                          style={{ transformOrigin: `${cx}px ${cy}px` }}
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r="25"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          className="opacity-40 animate-pulse"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r="5"
                          fill="#f43f5e"
                          className="opacity-90"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Sector Sidebar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-4">
              <Activity className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-slate-200">Sector Specifications</h3>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Active Name</span>
                <p className="text-md font-semibold text-slate-100">{selectedField.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Field Area</span>
                  <p className="text-sm font-medium text-slate-300">{selectedField.area_acres} Acres</p>
                </div>
                <div>
                  <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Active Crop</span>
                  <p className="text-sm font-medium text-slate-300 uppercase tracking-wide">{selectedField.crop_type}</p>
                </div>
              </div>

              <div className="border-t border-slate-850 my-2 pt-2">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Calculated Stress Level</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block h-3 w-3 rounded-full ${
                    selectedField.stress_level === 'high' ? 'bg-red-500 animate-ping' :
                    selectedField.stress_level === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`} />
                  <span className={`text-sm font-semibold capitalize ${
                    selectedField.stress_level === 'high' ? 'text-red-400' :
                    selectedField.stress_level === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {selectedField.stress_level || 'No Data'} Stress
                  </span>
                </div>
              </div>

              {selectedField.nitrogen_val !== null && (
                <div className="space-y-2 border-t border-slate-850 pt-2">
                  <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Real-Time Sensor Returns</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded bg-slate-950 p-2 text-center border border-slate-850">
                      <span className="block text-3xs font-semibold text-slate-500 uppercase">Nitrogen</span>
                      <span className="text-xs font-mono font-bold text-slate-200">{selectedField.nitrogen_val} <span className="text-4xs text-slate-500 font-sans">mg/kg</span></span>
                    </div>
                    <div className="rounded bg-slate-950 p-2 text-center border border-slate-850">
                      <span className="block text-3xs font-semibold text-slate-500 uppercase">Moisture</span>
                      <span className="text-xs font-mono font-bold text-slate-200">{selectedField.moisture_val}%</span>
                    </div>
                    <div className="rounded bg-slate-950 p-2 text-center border border-slate-850">
                      <span className="block text-3xs font-semibold text-slate-500 uppercase">pH</span>
                      <span className="text-xs font-mono font-bold text-slate-200">{selectedField.ph_val}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-850 text-xs text-slate-400 leading-relaxed flex gap-2">
            <HelpCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              Click directly on any field sector inside the map layout to update specifications and load corresponding trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
