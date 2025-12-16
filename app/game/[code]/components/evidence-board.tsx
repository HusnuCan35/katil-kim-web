import { Clue } from '@/types';
import { memo } from 'react';

interface EvidenceBoardProps {
    clues: Clue[];
    selectedLabClues: (Clue | null)[];
    onAddToLab: (clue: Clue) => void;
    onUnlockRequest: (clue: Clue) => void;
}

export const EvidenceBoard = memo(function EvidenceBoard({ clues, selectedLabClues, onAddToLab, onUnlockRequest }: EvidenceBoardProps) {
    const hiddenClues = clues.filter(c => c.visible_to !== 'BOTH');

    return (
        <div className="lg:col-span-4 space-y-6">
            {/* My Clues */}
            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                <div className="flex justify-between items-end mb-3">
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg text-white font-bold flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#dc2828] rounded-full"></span>
                        Gizli Dosyalarım
                    </h3>
                    <span className="text-[9px] text-[#d4af37]/80 uppercase tracking-wide font-bold bg-[#d4af37]/10 px-2 py-0.5 rounded-full border border-[#d4af37]/20">ÖZEL</span>
                </div>
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#dc2828]">visibility_off</span>
                    Bu ipuçlarını sadece sen görüyorsun. Ortağına anlat!
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {hiddenClues.map((clue, index) => (
                        <div
                            key={clue.id}
                            className={`relative group cursor-grab active:cursor-grabbing transform ${index % 2 === 0 ? 'rotate-[-2deg]' : 'rotate-[1deg]'} hover:rotate-0 transition-transform duration-300 z-10 hover:z-20`}
                        >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#8b0000] shadow shadow-black/50 z-20 border border-white/20"></div>
                            <div className="bg-[#f0f0f0] p-2 pb-4 rounded shadow-polaroid">
                                <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] overflow-hidden relative shadow-inner mb-2 rounded flex items-center justify-center">
                                    {clue.is_locked ? (
                                        <span className="material-symbols-outlined text-gray-600 text-3xl">lock</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[#dc2828]/40 text-4xl">description</span>
                                    )}
                                </div>
                                <div className="text-center px-1">
                                    <h4 className="font-[family-name:var(--font-playfair)] text-gray-900 text-xs font-bold uppercase tracking-wider truncate">{clue.title}</h4>
                                    {clue.is_locked && clue.locked_with_code ? (
                                        <button
                                            onClick={() => onUnlockRequest(clue)}
                                            className="mt-2 w-full py-1.5 bg-[#dc2828] hover:bg-[#b51f1f] rounded text-[10px] font-bold text-white transition-colors"
                                        >
                                            Şifreyi Gir
                                        </button>
                                    ) : !clue.is_locked && (
                                        <p className="font-mono text-[9px] text-gray-500 mt-0.5 line-clamp-2">{clue.description}</p>
                                    )}
                                </div>
                                {!clue.is_locked && (
                                    <button
                                        onClick={() => onAddToLab(clue)}
                                        className="absolute top-1 right-1 z-30 bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors shadow"
                                    >
                                        + Lab
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
