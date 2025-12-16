import { formatTime } from '@/lib/game-utils';
import { Case, Role } from '@/types';

interface GameHeaderProps {
    gameCase: Case;
    timeLeft: number;
    playerRole: Role | null;
    onExit: () => void;
}

export function GameHeader({ gameCase, timeLeft, playerRole, onExit }: GameHeaderProps) {
    return (
        <header className="sticky top-0 z-40">
            <div className="bg-[#0f0f0f]/80 backdrop-blur-xl border-b border-[#333] relative z-20">
                <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onExit}
                            className="p-2.5 rounded-full bg-[#1a1a1a] border border-[#333] hover:border-[#dc2828]/50 hover:bg-[#dc2828]/10 transition-all group"
                            title="Oyundan Ayrıl"
                        >
                            <span className="material-symbols-outlined text-gray-400 group-hover:text-[#dc2828] text-lg transition-colors">logout</span>
                        </button>
                        <div>
                            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-white">{gameCase.title}</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Dosya No: #{gameCase.id.toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Timer Badge */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 300 ? 'bg-[#dc2828]/10 border-[#dc2828]/30 text-[#ff4d4d] animate-pulse' : 'bg-[#1a1a1a] border-[#333] text-gray-300'}`}>
                            <span className="material-symbols-outlined text-lg">timer</span>
                            <span className="font-mono font-bold tracking-wider tabular-nums">{formatTime(timeLeft)}</span>
                        </div>

                        {/* Role Badge */}
                        <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-gradient-to-r from-gray-900 via-[#1a1a1a] to-gray-900 border border-[#d4af37]/20 shadow-lg">
                            <div className="flex flex-col items-end pr-2 leading-tight">
                                <span className="text-[9px] uppercase tracking-widest text-[#d4af37]/80 font-bold">Rol</span>
                                <span className="text-xs font-[family-name:var(--font-playfair)] font-bold text-white">{playerRole === 'DETECTIVE_A' ? 'Baş Dedektif' : 'Yardımcı'}</span>
                            </div>
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#dc2828] to-[#8b0000] flex items-center justify-center border border-[#d4af37]/40">
                                    <span className="material-symbols-outlined text-white text-sm">local_police</span>
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1a1a]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
