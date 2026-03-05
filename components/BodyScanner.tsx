import React, { useState } from 'react';
import { PainArea } from '../types';

interface BodyScannerProps {
  onConfirm: (areas: PainArea[]) => void;
  onCancel: () => void;
  isDoctorView?: boolean;
  initialAreas?: PainArea[];
}

const BODY_ZONES = {
  Front: [
    { id: 'f-head', label: 'Cranium / Face', cx: 50, cy: 7, r: 5 },
    { id: 'f-neck', label: 'Cervical / Neck', cx: 50, cy: 13, r: 3 },
    { id: 'f-chest', label: 'Thoracic / Chest', cx: 50, cy: 22, r: 7 },
    { id: 'f-stomach', label: 'Abdominal / Core', cx: 50, cy: 35, r: 6 },
    { id: 'f-pelvis', label: 'Pelvic Region', cx: 50, cy: 45, r: 5 },
    { id: 'f-l-shoulder', label: 'L Shoulder', cx: 37, cy: 18, r: 4 },
    { id: 'f-r-shoulder', label: 'R Shoulder', cx: 63, cy: 18, r: 4 },
    { id: 'f-l-arm', label: 'L Upper Arm', cx: 32, cy: 28, r: 4 },
    { id: 'f-r-arm', label: 'R Upper Arm', cx: 68, cy: 28, r: 4 },
    { id: 'f-l-forearm', label: 'L Forearm', cx: 29, cy: 40, r: 4 },
    { id: 'f-r-forearm', label: 'R Forearm', cx: 71, cy: 40, r: 4 },
    { id: 'f-l-thigh', label: 'L Thigh', cx: 43, cy: 60, r: 5 },
    { id: 'f-r-thigh', label: 'R Thigh', cx: 57, cy: 60, r: 5 },
    { id: 'f-l-knee', label: 'L Knee', cx: 43, cy: 75, r: 4 },
    { id: 'f-r-knee', label: 'R Knee', cx: 57, cy: 75, r: 4 },
    { id: 'f-l-ankle', label: 'L Ankle / Foot', cx: 43, cy: 90, r: 4 },
    { id: 'f-r-ankle', label: 'R Ankle / Foot', cx: 57, cy: 90, r: 4 },
  ],
  Back: [
    { id: 'b-head', label: 'Occipital / Head', cx: 50, cy: 7, r: 5 },
    { id: 'b-neck', label: 'Upper Cervical', cx: 50, cy: 13, r: 3 },
    { id: 'b-u-back', label: 'Upper Back / Scapula', cx: 50, cy: 22, r: 7 },
    { id: 'b-l-back', label: 'Lower Back / Lumbar', cx: 50, cy: 38, r: 7 },
    { id: 'b-l-glute', label: 'L Glute', cx: 43, cy: 48, r: 5 },
    { id: 'b-r-glute', label: 'R Glute', cx: 57, cy: 48, r: 5 },
    { id: 'b-l-ham', label: 'L Hamstring', cx: 43, cy: 62, r: 5 },
    { id: 'b-r-ham', label: 'R Hamstring', cx: 57, cy: 62, r: 5 },
    { id: 'b-l-calf', label: 'L Calf', cx: 43, cy: 80, r: 4 },
    { id: 'b-r-calf', label: 'R Calf', cx: 57, cy: 80, r: 4 },
  ]
};

const BodyScanner: React.FC<BodyScannerProps> = ({ onConfirm, onCancel, isDoctorView = false, initialAreas = [] }) => {
  const [side, setSide] = useState<'Front' | 'Back'>('Front');
  const [selectedAreas, setSelectedAreas] = useState<PainArea[]>(initialAreas);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const toggleZone = (id: string, label: string) => {
    if (isDoctorView) return;
    const exists = selectedAreas.find(a => a.id === id);
    if (exists) {
      setSelectedAreas(prev => prev.filter(a => a.id !== id));
    } else {
      setSelectedAreas(prev => [...prev, { id, label, intensity: 5, side }]);
    }
  };

  const updateIntensity = (id: string, intensity: number) => {
    setSelectedAreas(prev => prev.map(a => a.id === id ? { ...a, intensity } : a));
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-500 overflow-hidden p-4 lg:p-8">
      <div className="w-full h-full max-w-7xl bg-white rounded-[20px] flex flex-col lg:flex-row overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.3)] border border-white/20">

        {/* Left: Anatomical Visualizer */}
        <div className="flex-1 bg-slate-950 relative flex flex-col items-center justify-center p-6 overflow-hidden">
          {/* AR Scan Line Effect */}
          <div className="ar-scan-line z-20 pointer-events-none"></div>

          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b5bfd_1px,transparent_1px)] [background-size:30px_30px]"></div>

          <div className="z-30 text-center mb-6">
            <h3 className="text-blue-400 font-bold text-[11px] uppercase tracking-[0.3em] mb-4">Holographic Biometry</h3>
            <div className="flex bg-white/5 p-1 rounded-[14px] border border-white/10">
              {(['Front', 'Back'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`px-6 py-2 rounded-[10px] text-[11px] font-bold uppercase tracking-wider transition-all ${side === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-white/40 hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-full w-full max-w-lg flex items-center justify-center">
            <svg viewBox="-25 0 150 100" className="w-full h-full drop-shadow-[0_0_40px_rgba(59,91,253,0.3)]">
              {/* Refined Silhouette */}
              <path
                d="M50,2 C54,2 57,5 57,9 C57,11 55,13 53,14 L53,16 C58,16 68,18 70,25 C72,32 72,45 70,55 C68,60 65,65 60,65 L57,65 L58,95 L50,98 L42,95 L43,65 L40,65 C35,65 32,60 30,55 C28,45 28,32 30,25 C32,18 42,16 47,16 L47,14 C45,13 43,11 43,9 C43,5 46,2 50,2"
                fill="#0a0c10"
                stroke="#1e293b"
                strokeWidth="0.8"
              />

              {/* Mapping Zones */}
              {BODY_ZONES[side].map(zone => {
                const selection = selectedAreas.find(a => a.id === zone.id);
                const isHovered = hoveredZone === zone.id;

                return (
                  <g
                    key={zone.id}
                    className={`cursor-pointer group ${isDoctorView ? 'pointer-events-none' : ''}`}
                    onClick={() => toggleZone(zone.id, zone.label)}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                  >
                    <circle
                      cx={zone.cx} cy={zone.cy} r={zone.r + 2}
                      fill="transparent"
                      className="transition-all"
                    />
                    <circle
                      cx={zone.cx} cy={zone.cy} r={zone.r}
                      className={`transition-all duration-300 pointer-events-none ${selection
                        ? 'fill-rose-500/50 stroke-rose-500 stroke-[1.5]'
                        : 'fill-blue-500/10 stroke-blue-500/30 stroke-[0.5] group-hover:fill-blue-500/40 group-hover:stroke-blue-400 group-hover:stroke-[1]'
                        }`}
                    />
                    {selection && (
                      <circle cx={zone.cx} cy={zone.cy} r={zone.r * 0.3} className="fill-rose-500 pointer-events-none" />
                    )}
                    {(selection || isHovered) && (
                      <foreignObject
                        x={zone.cx >= 50 ? zone.cx + zone.r + 2 : zone.cx - 42 - zone.r}
                        y={zone.cy - 3}
                        width="40"
                        height="12"
                        className={`pointer-events-none animate-in fade-in z-50 overflow-visible flex ${zone.cx >= 50 ? 'justify-start slide-in-from-left-2' : 'justify-end slide-in-from-right-2'}`}
                      >
                        <div className={`bg-white px-1.5 py-0.5 rounded-[4px] text-[3px] font-bold text-slate-900 uppercase tracking-widest shadow-xl inline-block ${zone.cx >= 50 ? 'border-l-[1px]' : 'border-r-[1px]'} border-blue-600 whitespace-nowrap`}>
                          {zone.label}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Intensity Calibration */}
        <div className="w-full lg:w-[420px] bg-white flex flex-col border-l border-slate-100 h-full">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center text-slate-900">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">Spatial Scan</h2>
              <p className="text-[13px] font-medium text-slate-500 mt-1">Calibrate region intensity</p>
            </div>
            <button onClick={onCancel} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-50/20">
            {selectedAreas.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-6">
                <div className="w-20 h-20 bg-white rounded-[20px] flex items-center justify-center text-3xl shadow-sm border border-slate-100">📍</div>
                <div>
                  <p className="text-[15px] font-bold text-slate-900">System Ready</p>
                  <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-[200px]">Select body zones to begin digital mapping</p>
                </div>
              </div>
            ) : (
              selectedAreas.map(area => (
                <div key={area.id} className="p-6 bg-white border border-slate-50 rounded-[20px] shadow-sm space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-blue-600 mb-1">{area.side} View</p>
                      <p className="text-[16px] font-bold text-slate-900 leading-tight">{area.label}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-xl font-bold shadow-lg transition-all ${area.intensity >= 8 ? 'bg-rose-500 text-white shadow-rose-500/20' : area.intensity >= 5 ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'
                      }`}>
                      {area.intensity}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400">
                      <span>Low</span>
                      <span>Mid</span>
                      <span>Severe</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      value={area.intensity}
                      disabled={isDoctorView}
                      onChange={(e) => updateIntensity(area.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100">
            {!isDoctorView && (
              <button
                disabled={selectedAreas.length === 0}
                onClick={() => onConfirm(selectedAreas)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[14px] font-bold text-[14px] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-30 flex items-center justify-center space-x-3 transition-all"
              >
                <span>Sync Mapping</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7-7 7M5 12h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyScanner;
