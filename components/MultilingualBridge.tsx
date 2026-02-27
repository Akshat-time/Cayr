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
    <div className="fixed inset-0 z-[3000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="max-w-4xl w-full h-[800px] bg-white rounded-[20px] shadow-[0_10px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 bg-white/10 rounded-[14px] flex items-center justify-center text-2xl">🇮🇳</div>
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">Multilingual Voice Bridge</h2>
              <p className="text-[13px] font-medium text-white/60 mt-1">Real-time Clinical Translation Active</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20 scrollbar-hide">
          {status === 'connecting' && (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[13px] font-bold text-slate-400 tracking-wider">Establishing Secure Stream...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
              <div className="text-5xl">⚠️</div>
              <h3 className="text-[20px] font-bold text-slate-900">Connection Failed</h3>
              <p className="text-[14px] font-medium text-slate-500 max-w-sm">Unable to initialize the secure voice bridge session.</p>
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-600 text-white rounded-[14px] font-bold text-[14px] hover:bg-blue-700 transition-all">Retry Session</button>
            </div>
          )}

          {status === 'active' && transcriptions.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[75%] p-5 rounded-[16px] shadow-sm ${t.role === 'user' ? 'bg-white border border-slate-100' : 'bg-blue-600 text-white'}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60">{t.role === 'user' ? 'Patient' : 'Ai Interpreter'}</p>
                <p className="text-[15px] font-medium leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}

          {status === 'active' && transcriptions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 bg-white rounded-[20px] flex items-center justify-center text-4xl mb-6 shadow-sm border border-slate-100">🎙️</div>
              <h3 className="text-[18px] font-bold text-slate-900">Ready to Interpret</h3>
              <p className="text-[14px] font-medium text-slate-500 mt-2">Speak naturally in your local language</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-16 h-16 rounded-[14px] flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
            >
              <span className="text-2xl">{isMuted ? '🔇' : '🎤'}</span>
            </button>
            <div>
              <p className="text-[14px] font-bold text-slate-900">Clinical Input</p>
              <p className={`text-[12px] font-bold ${isMuted ? 'text-rose-500' : 'text-emerald-500'}`}>{isMuted ? 'Microphone Muted' : 'Live Translation Active'}</p>
            </div>
          </div>

          <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-[14px] font-bold text-[14px] hover:bg-black transition-all">End Session</button>
        </div>
      </div>
    </div>
  );
};

export default MultilingualBridge;
