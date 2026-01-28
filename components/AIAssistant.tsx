
import React, { useState, useEffect, useRef } from 'react';
import { createGeneralAISession } from '../services/geminiService';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello! I am **Cayr AI**, your high-performance clinical and technical assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = createGeneralAISession();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    if (!userText || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: userText });
      
      let aiText = '';
      setMessages(prev => [...prev, { role: 'ai', text: '' }]);

      for await (const chunk of result) {
        const chunkText = chunk.text || '';
        aiText += chunkText;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'ai') {
            return [...prev.slice(0, -1), { role: 'ai', text: aiText }];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "I encountered an error processing that. Please try again or check your connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const content = part.replace(/```/g, '').trim();
        return (
          <pre key={i} className="bg-slate-900 text-slate-100 p-5 rounded-[24px] font-mono text-[11px] my-4 overflow-x-auto border border-white/10 shadow-inner">
            <code className="block leading-relaxed">{content}</code>
          </pre>
        );
      }
      
      return part.split('\n').map((line, j) => {
        if (line.trim() === '') return <div key={`${i}-${j}`} className="h-2" />;
        
        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900">$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-blue-50 text-[#3b5bfd] px-1.5 py-0.5 rounded-md font-mono text-[11px] border border-blue-100/50">$1</code>');
        
        return (
          <p key={`${i}-${j}`} className="mb-2 last:mb-0 text-[13px]" dangerouslySetInnerHTML={{ __html: html }} />
        );
      });
    });
  };

  return (
    <div className="fixed bottom-8 right-8 z-[1000] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[400px] h-[600px] bg-white border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-[40px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="p-6 bg-[#1a1d1f] text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#3b5bfd] rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">✨</div>
              <div>
                <p className="font-black text-sm tracking-tight leading-none">Cayr Pro AI</p>
                <p className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em] mt-1">Gemini 3 Pro Engine</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-[#f8fafc]/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-5 rounded-[28px] leading-relaxed font-medium shadow-sm ${m.role === 'user' ? 'bg-[#3b5bfd] text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                  {renderContent(m.text)}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 px-5 py-4 rounded-[28px] rounded-tl-none shadow-sm flex items-center space-x-1.5 animate-in slide-in-from-bottom-1 fade-in duration-300">
                  <div className="w-1.5 h-1.5 bg-[#3b5bfd] rounded-full animate-bounce [animation-duration:0.8s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#3b5bfd] rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#3b5bfd] rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-50">
            <form onSubmit={handleSend} className="flex items-center space-x-3">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[13px] font-medium outline-none focus:border-blue-500 transition-all focus:bg-white"
                disabled={isTyping}
              />
              <button 
                type="submit"
                disabled={isTyping || !input.trim()}
                className="w-12 h-12 bg-[#3b5bfd] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9-7-9-7V7l11 5-11 5v-1z"/></svg>
              </button>
            </form>
            <p className="text-[8px] text-center text-slate-300 font-black uppercase tracking-widest mt-4">AI may display inaccurate information. Review clinical outputs.</p>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 relative group ${isOpen ? 'bg-[#1a1d1f] text-white rotate-90' : 'bg-[#3b5bfd] text-white'}`}
        aria-label="Open AI Assistant"
      >
        {isOpen ? '✕' : '✨'}
        {!isOpen && <div className="absolute inset-0 bg-blue-400 rounded-[24px] animate-ping opacity-20 pointer-events-none"></div>}
        <div className="absolute right-full mr-4 px-4 py-2 bg-[#1a1d1f] text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">How can I help?</div>
      </button>
    </div>
  );
};

export default AIAssistant;
