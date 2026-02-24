import React, { useState, useEffect, useRef } from 'react';

interface Message {
    _id: string;
    senderId: string;
    text: string;
    type: 'text' | 'signal';
    createdAt: string;
}

interface ChatSessionContainerProps {
    appointmentId: string;
    currentUserId: string;
    onClose: () => void;
}

const ChatSessionContainer: React.FC<ChatSessionContainerProps> = ({ appointmentId, currentUserId, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<{ isActive: boolean; isExpired: boolean; expiresAt?: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chats/${appointmentId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
                setSessionInfo(data.session);
            }
        } catch (err) {
            console.error('Fetch messages failed', err);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 4000);
        return () => clearInterval(interval);
    }, [appointmentId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isSending || !sessionInfo?.isActive) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/chats/${appointmentId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText })
            });
            if (res.ok) {
                setInputText('');
                fetchMessages();
            }
        } catch (err) {
            console.error('Send message failed', err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] flex flex-col bg-white rounded-[32px] shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black tracking-tighter">Clinical Consult</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {sessionInfo?.isExpired ? 'Session Expired' : sessionInfo?.isActive ? 'Secure Connection Active' : 'Waiting for payment...'}
                    </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">×</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {messages.map((m) => {
                    const isMe = m.senderId === currentUserId;
                    return (
                        <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                }`}>
                                {m.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />

                {sessionInfo?.isExpired && (
                    <div className="p-4 bg-red-50 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">This consultation session has ended.</p>
                    </div>
                )}
            </div>

            {/* Input */}
            {!sessionInfo?.isExpired && (
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                    <input
                        type="text"
                        placeholder="Type clinical inquiry..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={!sessionInfo?.isActive || isSending}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:border-blue-300 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!sessionInfo?.isActive || isSending || !inputText.trim()}
                        className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        ➤
                    </button>
                </form>
            )}
        </div>
    );
};

export default ChatSessionContainer;
