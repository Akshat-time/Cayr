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
  const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll transcriptions
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions]);

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

    // Connection timeout — if still connecting after 10 s, show error
    timeoutRef.current = setTimeout(() => {
      setStatus(prev => prev === 'connecting' ? 'error' : prev);
    }, 10000);

    const setupLiveSession = async () => {
      try {
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const bridgePromise = connectVoiceBridge({
          onopen: () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
                  session?.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscriptions(prev => [...prev, { role: 'user', text }]);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscriptions(prev => [...prev, { role: 'ai', text }]);
            }

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
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setStatus('error');
          },
          onclose: () => setStatus('connecting')
        });

        if (!bridgePromise) {
          console.warn("Voice Bridge not supported on fallback.");
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setStatus('error');
          return;
        }

        sessionPromiseRef.current = bridgePromise;

      } catch (err) {
        console.error("Voice Bridge Setup Failed:", err);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus('error');
      }
    };

    setupLiveSession();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stream?.getTracks().forEach(t => t.stop());
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
      sessionPromiseRef.current?.then(s => s?.close());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-lg w-full bg-white rounded-[20px] shadow-[0_10px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 bg-white/10 rounded-[12px] flex items-center justify-center text-xl">🇮🇳</div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight">Multilingual Voice Bridge</h2>
              <p className="text-[12px] font-medium text-white/60 mt-0.5">Real-time Clinical Translation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all font-bold text-sm">✕</button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20 min-h-0">
          {status === 'connecting' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[13px] font-bold text-slate-400 tracking-wider">Establishing Secure Stream...</p>
              <p className="text-[11px] text-slate-400">Connecting to {partnerName}. This may take a moment.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-5 text-center">
              <div className="text-5xl">⚠️</div>
              <h3 className="text-[18px] font-bold text-slate-900">Voice Bridge Unavailable</h3>
              <p className="text-[13px] font-medium text-slate-500 max-w-xs">The Real-time Voice Bridge requires an active Google Gemini API key. Currently using standard fallback services.</p>
              <div className="flex gap-3">
                <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-blue-600 text-white rounded-[12px] font-bold text-[13px] hover:bg-blue-700 transition-all">Retry</button>
                <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-[12px] font-bold text-[13px] hover:bg-slate-200 transition-all">Close</button>
              </div>
            </div>
          )}

          {status === 'active' && transcriptions.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] p-4 rounded-[14px] shadow-sm ${t.role === 'user' ? 'bg-white border border-slate-100' : 'bg-blue-600 text-white'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-60">{t.role === 'user' ? 'Patient / User' : 'AI Interpreter'}</p>
                <p className="text-[14px] font-medium leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}

          {status === 'active' && transcriptions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center opacity-50">
              <div className="w-16 h-16 bg-white rounded-[16px] flex items-center justify-center text-3xl mb-4 shadow-sm border border-slate-100">🎙️</div>
              <h3 className="text-[16px] font-bold text-slate-900">Ready to Interpret</h3>
              <p className="text-[13px] font-medium text-slate-500 mt-1">Speak naturally in your local language</p>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-[12px] flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
            >
              <span className="text-xl">{isMuted ? '🔇' : '🎤'}</span>
            </button>
            <div>
              <p className="text-[13px] font-bold text-slate-900">Clinical Input</p>
              <p className={`text-[11px] font-bold ${isMuted ? 'text-rose-500' : status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`}>
                {isMuted ? 'Microphone Muted' : status === 'active' ? 'Live Translation Active' : 'Connecting...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="px-7 py-3 bg-slate-900 text-white rounded-[12px] font-bold text-[13px] hover:bg-black transition-all">End Session</button>
        </div>
      </div>
    </div>
  );
};

export default MultilingualBridge;
