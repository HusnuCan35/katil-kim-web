import { TimelineEvent } from '@/types';

interface TimelineBuilderProps {
    events: TimelineEvent[];
    setEvents: (events: TimelineEvent[]) => void;
    isVerified: boolean;
    onCheck: () => void;
}

export function TimelineBuilder({ events, setEvents, isVerified, onCheck }: TimelineBuilderProps) {
    const moveEvent = (index: number, direction: number) => {
        const newEvents = [...events];
        const targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < newEvents.length) {
            [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];
            setEvents(newEvents);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#dc2828]/20 rounded-xl">
                    <span className="material-symbols-outlined text-[#dc2828] text-2xl">schedule</span>
                </div>
                <div>
                    <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-white">Zaman Çizelgesi</h2>
                    <p className="text-xs text-white/50">Olayları doğru sıraya dizerek alibileri kontrol et</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-[#1a1212]/90 to-[#0f0a0a] p-5 rounded-2xl border border-white/10 space-y-0 relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#dc2828]/50 via-[#dc2828]/20 to-transparent"></div>

                {events.map((event, index) => (
                    <div key={event.id} className="flex items-start gap-4 relative pb-4 last:pb-0">
                        {/* Timeline Marker */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full border-2 ${isVerified ? 'bg-[#22c55e] border-[#22c55e]' : 'bg-[#dc2828]/20 border-[#dc2828]/50'} shadow-[0_0_10px_rgba(220,40,40,0.3)]`}></div>
                        </div>

                        {/* Event Card */}
                        <div className="flex-1 bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-mono text-[#dc2828] font-bold">{event.time}</span>
                                        {isVerified && <span className="material-symbols-outlined text-[#22c55e] text-lg">verified</span>}
                                    </div>
                                    <p className="text-base font-semibold text-white mb-1">{event.title}</p>
                                    <p className="text-sm text-white/50">{event.description}</p>
                                </div>

                                {/* Move Buttons */}
                                {!isVerified && (
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveEvent(index, -1)}
                                            disabled={index === 0}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-lg">expand_less</span>
                                        </button>
                                        <button
                                            onClick={() => moveEvent(index, 1)}
                                            disabled={index === events.length - 1}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-lg">expand_more</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {!isVerified ? (
                <button
                    onClick={onCheck}
                    className="w-full py-4 bg-gradient-to-r from-[#dc2828] to-[#b91c1c] hover:from-[#ef4444] hover:to-[#dc2828] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,40,40,0.3)] flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">fact_check</span>
                    Sıralamayı Kontrol Et
                </button>
            ) : (
                <div className="p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[#22c55e] text-2xl">verified</span>
                        <p className="text-[#22c55e] font-bold text-base">Zaman Çizelgesi Doğrulandı!</p>
                    </div>
                    <p className="text-sm text-[#22c55e]/70">Olayların akışı netleşti.</p>
                </div>
            )}
        </div>
    );
}
