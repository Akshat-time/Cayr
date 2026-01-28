
import React, { useEffect, useRef, useState } from 'react';
import { connectVoiceBridge } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

interface MultilingualBridgeProps {
  onClose: () => void;
  partnerName: string;
}

const MultilingualBridge: React.FC<MultilingualBridgeProps> = ({ onClose, partnerName }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Manual implementation of encode/decode as required by guidelines
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;

    const setupLiveSession = async () => {
      try {
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        sessionPromiseRef.current = connectVoiceBridge({
          onopen: () => {
            setStatus('active');
            if (inputAudioContextRef.current && stream) {
              const source = inputAudioContextRef.current.createMediaStreamSource(stream);
              scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                
                sessionPromiseRef.current?.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscriptions(prev => [...prev, { role: 'user', text }]);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscriptions(prev => [...prev, { role: 'ai', text }]);
            }

            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live Bridge Error:", e);
            setStatus('error');
          },
          onclose: () => setStatus('connecting')
        });
      } catch (err) {
        console.error("Voice Bridge Setup Failed:", err);
        setStatus('error');
      }
    };

    setupLiveSession();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
      sessionPromiseRef.current?.then(s => s.close());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-900/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-4xl w-full flex flex-col h-[80vh] bg-white rounded-[48px] shadow-2xl overflow-hidden border border-white/20">
        <div className="p-10 bg-gradient-to-r from-[#1a1d1f] to-[#3b5bfd] text-white flex justify-between items-center">
           <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-3xl shadow-inner border border-white/10 animate-pulse">🇮🇳</div>
              <div>
                 <h2 className="text-3xl font-black tracking-tight leading-none">Multilingual Voice Bridge</h2>
                 <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mt-3">Detecting Hindi, Tamil, Telugu, Marathi...</p>
              </div>
           </div>
           <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-[#f8fafc]/50 scrollbar-hide">
           {status === 'connecting' && (
             <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Establishing Clinical Audio Stream...</p>
             </div>
           )}
           
           {status === 'error' && (
             <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
                <div className="text-6xl">⚠️</div>
                <p className="text-lg font-black text-rose-500">Could not initialize Voice Bridge.</p>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#3b5bfd] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Retry Connection</button>
             </div>
           )}

           {status === 'active' && transcriptions.map((t, i) => (
             <div key={i} className={`flex ${t.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[80%] p-6 rounded-[32px] shadow-sm flex flex-col ${t.role === 'user' ? 'bg-white border border-slate-100 rounded-tl-none' : 'bg-[#3b5bfd] text-white rounded-tr-none'}`}>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">{t.role === 'user' ? 'Patient Audio Detected' : 'Clinical Translation'}</span>
                   <p className="text-sm font-bold leading-relaxed">{t.text}</p>
                </div>
             </div>
           ))}
           {status === 'active' && transcriptions.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                 <div className="text-8xl mb-6">🎙️</div>
                 <p className="text-xl font-black text-slate-800 tracking-tight">Speak naturally in your local language</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-4">AI will translate in real-time for the doctor</p>
              </div>
           )}
        </div>

        <div className="p-10 bg-white border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center space-x-6">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`w-20 h-20 rounded-[32px] flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
              >
                 {isMuted ? '🔇' : '🎤'}
              </button>
              <div>
                 <p className="text-sm font-black text-slate-800">Microphone Input</p>
                 <p className={`text-[10px] font-black uppercase tracking-widest ${isMuted ? 'text-rose-500' : 'text-green-500'}`}>{isMuted ? 'Capture Paused' : 'Live Audio Active'}</p>
              </div>
           </div>

           <div className="flex space-x-4">
              <button onClick={onClose} className="px-10 py-5 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all">End Session</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MultilingualBridge;
