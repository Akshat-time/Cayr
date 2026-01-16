
import React, { useEffect, useRef, useState } from 'react';

interface VideoCallProps {
  onEnd: () => void;
  partnerName: string;
  partnerRole: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ onEnd, partnerName, partnerRole }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'Excellent' | 'Stable' | 'Weak'>('Excellent');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    startCamera();

    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Randomize connection quality for realism
    const qualityTimer = setInterval(() => {
      const q = ['Excellent', 'Stable', 'Stable', 'Excellent'][Math.floor(Math.random() * 4)];
      setConnectionQuality(q as any);
    }, 15000);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(timer);
      clearInterval(qualityTimer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0a0c10] flex flex-col items-center justify-center animate-in fade-in duration-500">
      {/* Background / Main Remote Feed (Simulated) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center bg-slate-800/40">
          <div className="text-center relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="w-40 h-40 bg-slate-900 rounded-full flex items-center justify-center text-6xl mb-8 mx-auto border-4 border-white/5 shadow-2xl relative z-10">
              {partnerName.charAt(0)}
            </div>
            <p className="text-white font-black text-2xl uppercase tracking-[0.4em] relative z-10">{partnerName}</p>
            <p className="text-blue-400 text-xs mt-4 uppercase tracking-[0.3em] font-black opacity-60 relative z-10">Secure Clinical Link Active</p>
          </div>
        </div>
        
        {/* Connection Info Bar */}
        <div className="absolute top-10 inset-x-10 flex items-center justify-between">
          <div className="flex items-center space-x-6 bg-slate-950/40 backdrop-blur-xl px-8 py-4 rounded-[32px] border border-white/5 shadow-2xl">
            <div className="flex items-center space-x-3 border-r border-white/10 pr-6">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
              <div className="flex flex-col">
                <p className="text-white font-black text-sm tracking-tight">{partnerName}</p>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">{partnerRole}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Status</p>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`w-1 h-3 rounded-full ${i <= (connectionQuality === 'Excellent' ? 5 : 3) ? 'bg-green-500' : 'bg-white/10'}`}></div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Duration</p>
                <p className="text-white font-mono text-sm font-black">{formatTime(callDuration)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/40 backdrop-blur-xl px-6 py-4 rounded-[24px] border border-white/5">
             <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20">AI</div>
             <div className="flex flex-col">
               <p className="text-white font-black text-[10px] uppercase tracking-widest">Scribe Mode</p>
               <p className="text-green-500 text-[9px] font-bold">Transcription active...</p>
             </div>
          </div>
        </div>

        {/* Live Subtitles Simulation */}
        <div className="absolute bottom-40 inset-x-20 text-center">
           <p className="text-white/80 text-xl font-medium tracking-tight bg-black/40 backdrop-blur-md inline-block px-8 py-3 rounded-2xl animate-in slide-in-from-bottom-4 duration-1000">
             "Doctor, I've been feeling a bit of recurring pressure in my chest..."
           </p>
        </div>
      </div>

      {/* Local Self View */}
      <div className="absolute bottom-32 right-12 w-56 h-72 md:w-72 md:h-96 bg-slate-950 rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-4 border-white/10 group transition-all hover:scale-[1.02]">
        {!isCameraOff ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover mirror" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1d21]">
             <div className="text-center">
               <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-2xl text-white/20 font-black mx-auto mb-4 border border-white/5">
                  You
               </div>
               <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Camera Disabled</p>
             </div>
          </div>
        )}
        <div className="absolute top-6 left-6 flex space-x-1">
           <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
           <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Live</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
           <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">HD Source • 60 FPS</p>
        </div>
      </div>

      {/* Controls Container */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center space-x-6 bg-[#0f1115]/90 backdrop-blur-3xl px-12 py-7 rounded-[48px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        
        <div className="group relative">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l22 22"/></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            )}
          </button>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {isMuted ? "Unmute Mic" : "Mute Mic"}
          </div>
        </div>

        <div className="group relative">
          <button 
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all ${isCameraOff ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
            aria-label={isCameraOff ? "Start Camera" : "Stop Camera"}
          >
            {isCameraOff ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l22 22"/></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            )}
          </button>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {isCameraOff ? "Enable Video" : "Disable Video"}
          </div>
        </div>

        <div className="w-px h-10 bg-white/10 mx-2"></div>

        <div className="group relative">
          <button 
            onClick={onEnd}
            className="w-20 h-14 bg-rose-600 text-white rounded-[24px] flex items-center justify-center hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/40 active:scale-95"
            aria-label="End Call"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16.5c0 .38-.21.71-.53.88l-4.87 2.44c-.53.26-1.18.15-1.59-.26l-2.02-2.02c-2.43-.54-4.63-1.59-6.52-3.08l-2.02-2.02c-.41-.41-.52-1.06-.26-1.59L5.62 3.97c.17-.32.5-.53.88-.53H11c.55 0 1 .45 1 1v3.5c0 .55-.45 1-1 1h-2.1c.5 1.48 1.41 2.83 2.62 3.94 1.11 1.21 2.46 2.12 3.94 2.62V13c0-.55.45-1 1-1H20c.55 0 1 .45 1 1v3.5z" transform="rotate(135 12 12)"/></svg>
          </button>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            End Consultation
          </div>
        </div>
      </div>

      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
};

export default VideoCall;
