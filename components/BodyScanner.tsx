
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
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex items-center justify-center animate-in fade-in duration-500 overflow-hidden">
      <div className="w-full h-full bg-white flex flex-col lg:flex-row overflow-hidden">

        {/* Left: Anatomical Visualizer */}
        <div className="flex-1 bg-slate-950 relative flex flex-col items-center justify-center p-8 overflow-hidden">
          {/* AR Scan Line Effect */}
          <div className="ar-scan-line z-20 pointer-events-none"></div>

          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b5bfd_1px,transparent_1px)] [background-size:30px_30px]"></div>

          <div className="z-30 text-center mb-10">
            <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.4em] mb-4">Holographic AR Biometry</h3>
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
              {(['Front', 'Back'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${side === s ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-white/40 hover:text-white'}`}
                >
                  {s} View
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-full w-full max-w-lg flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_50px_rgba(59,91,253,0.3)]">
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
                    {/* Interaction Hitbox (Invisible but large) */}
                    <circle
                      cx={zone.cx} cy={zone.cy} r={zone.r + 2}
                      fill="transparent"
                      className="transition-all"
                    />
                    {/* Visual Indicator */}
                    <circle
                      cx={zone.cx} cy={zone.cy} r={zone.r}
                      className={`transition-all duration-300 pointer-events-none ${selection
                          ? 'fill-rose-500/50 stroke-rose-500 stroke-[1.5] shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                          : 'fill-blue-500/10 stroke-blue-500/30 stroke-[0.5] group-hover:fill-blue-500/40 group-hover:stroke-blue-400 group-hover:stroke-[1]'
                        }`}
                    />
                    {selection && (
                      <circle cx={zone.cx} cy={zone.cy} r={zone.r * 0.3} className="fill-rose-500 pointer-events-none" />
                    )}
                    {(selection || isHovered) && (
                      <foreignObject
                        x={zone.cx + zone.r + 1}
                        y={zone.cy - 2}
                        width="40"
                        height="12"
                        className="pointer-events-none animate-in fade-in slide-in-from-left-2 z-50 overflow-visible"
                      >
                        <div className="bg-white px-1.5 py-0.5 rounded-sm text-[2.5px] font-black text-slate-950 uppercase tracking-[0.05em] shadow-lg inline-block border-l-[0.5px] border-blue-600 pointer-events-none whitespace-nowrap">
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
        <div className="w-full lg:w-[480px] bg-white flex flex-col border-l border-slate-100 h-full">
          <div className="p-12 border-b border-slate-50 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Spatial Assessment</h2>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-4">Calibrate intensity per region</p>
            </div>
            <button onClick={onCancel} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-hide bg-slate-50/20">
            {selectedAreas.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-8">
                <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center text-4xl shadow-sm border border-slate-100">📍</div>
                <div>
                  <p className="text-base font-black text-slate-900 tracking-tight">System Ready</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed mt-2 max-w-[240px] mx-auto">Select anatomical zones on the 3D model to begin digital mapping</p>
                </div>
              </div>
            ) : (
              selectedAreas.map(area => (
                <div key={area.id} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm space-y-8 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#3b5bfd] mb-1">{area.side} Assessment</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">{area.label}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-xl transition-all ${area.intensity >= 8 ? 'bg-rose-500 text-white shadow-rose-200' : area.intensity >= 5 ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-emerald-500 text-white shadow-emerald-200'
                      }`}>
                      {area.intensity}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Mild</span>
                      <span>Moderate</span>
                      <span>Severe</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      value={area.intensity}
                      disabled={isDoctorView}
                      onChange={(e) => updateIntensity(area.id, parseInt(e.target.value))}
                      className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#3b5bfd]"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-12 bg-white border-t border-slate-100 flex items-center space-x-4">
            {!isDoctorView && (
              <button
                disabled={selectedAreas.length === 0}
                onClick={() => onConfirm(selectedAreas)}
                className="w-full py-6 bg-[#3b5bfd] text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 hover:bg-[#2d46e5] transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center space-x-4"
              >
                <span>Transmit Mapping</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7-7 7M5 12h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyScanner;
