import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp } from '@/lib/animations';
import { Message } from '@/types';
import { useState, useRef, useEffect } from 'react';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
    playerId: string | null;
    onSendMessage: (content: string) => void;
    notes: string;
    setNotes: (notes: string) => void;
}

export function ChatModal({ isOpen, onClose, messages, playerId, onSendMessage, notes, setNotes }: ChatModalProps) {
    const [chatTab, setChatTab] = useState<'Chat' | 'Notes'>('Chat');
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, messages]);

    const handleSend = () => {
        if (!messageInput.trim()) return;
        onSendMessage(messageInput);
        setMessageInput('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 bg-[#0f0a0a]/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-50"
                >
                    <motion.div
                        variants={scaleUp}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-gradient-to-br from-[#1a1212] to-[#0f0a0a] border border-white/10 rounded-3xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl overflow-hidden relative"
                    >
                        {/* Decorative Corner */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-3xl"></div>

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 relative z-10">
                            <div className="flex gap-1 bg-black/30 p-1 rounded-xl">
                                <button
                                    onClick={() => setChatTab('Chat')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${chatTab === 'Chat' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">chat</span>
                                    Sohbet
                                </button>
                                <button
                                    onClick={() => setChatTab('Notes')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${chatTab === 'Notes' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">edit_note</span>
                                    Notlar
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {chatTab === 'Chat' ? (
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.length === 0 ? (
                                            <div className="text-center mt-16">
                                                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-full mb-4">
                                                    <span className="material-symbols-outlined text-white/20 text-3xl">forum</span>
                                                </div>
                                                <p className="text-white/30 text-sm">Henüz mesaj yok.</p>
                                                <p className="text-white/20 text-xs">Diğer dedektiflerle konuşun.</p>
                                            </div>
                                        ) : (
                                            messages.map(msg => {
                                                const isMe = msg.player_id === playerId;
                                                const colors = ['#dc2828', '#d4af37', '#3b82f6', '#22c55e', '#a855f7'];
                                                const colorIndex = (msg.player_id || 'x').charCodeAt(0) % colors.length;
                                                const avatarColor = colors[colorIndex];

                                                return (
                                                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        {/* Avatar */}
                                                        <div
                                                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border"
                                                            style={{
                                                                backgroundColor: `${avatarColor}20`,
                                                                borderColor: `${avatarColor}40`
                                                            }}
                                                        >
                                                            <span className="material-symbols-outlined text-sm" style={{ color: avatarColor }}>person</span>
                                                        </div>

                                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                                            <p className="text-[10px] font-bold text-white/40 mb-1 px-1">{msg.player_name}</p>
                                                            <div className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#dc2828]/30 border border-[#dc2828]/30 rounded-tr-md' : 'bg-white/5 border border-white/10 rounded-tl-md'}`}>
                                                                <p className="text-sm text-white/90">{msg.content}</p>
                                                            </div>
                                                            <span className="text-[10px] text-white/30 mt-1 px-1">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input */}
                                    <div className="p-4 border-t border-white/10 flex gap-2">
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Mesaj yaz..."
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#d4af37]/50 transition-colors text-white placeholder-white/30"
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!messageInput.trim()}
                                            className="bg-gradient-to-r from-[#dc2828] to-[#b91c1c] hover:from-[#ef4444] hover:to-[#dc2828] disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 text-white p-3 rounded-xl transition-all shadow-[0_0_15px_rgba(220,40,40,0.3)] disabled:shadow-none"
                                        >
                                            <span className="material-symbols-outlined">send</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-[#d4af37] text-lg">lock</span>
                                        <p className="text-xs text-white/40">Bu notlar sadece sizin cihazınızda saklanır.</p>
                                    </div>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Şüpheli hareketler, ipuçları, teoriler..."
                                        className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-[#d4af37]/50 transition-colors resize-none text-white placeholder-white/30 text-sm"
                                    />
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="flex items-center gap-2 text-xs text-white/30">
                                            <span className="material-symbols-outlined text-[#22c55e] text-sm">check_circle</span>
                                            Otomatik Kaydediliyor
                                        </div>
                                        {notes.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Notları silmek istediğinize emin misiniz?')) setNotes('');
                                                }}
                                                className="text-[#dc2828] hover:text-[#dc2828]/80 text-xs flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                Temizle
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
