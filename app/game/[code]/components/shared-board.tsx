import { Clue } from '@/types';
import { useSound } from '@/hooks/use-sound';
import { memo } from 'react';

interface SharedBoardProps {
    sharedClues: Clue[];
    selectedLabClues: (Clue | null)[];
    discoveredClues: Clue[];
    onAddToLab: (clue: Clue) => void;
    onRemoveFromLab: (index: number) => void;
    onCombineClues: () => void;
    onAccuse: () => void;
}

export const SharedBoard = memo(function SharedBoard({ sharedClues, selectedLabClues, discoveredClues, onAddToLab, onRemoveFromLab, onCombineClues, onAccuse }: SharedBoardProps) {
    const { playSound } = useSound();

    return (
        <div className="lg:col-span-5 space-y-6">
            <section>
                <div className="flex justify-between items-end mb-3">
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg text-white font-bold flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#dc2828] rounded-full"></span>
                        Kanıt Panosu
                    </h3>
                </div>
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#dc2828]">group</span>
                    Her iki dedektifin de bildiği gerçekler.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {sharedClues.map((clue, index) => (
                        <div
                            key={clue.id}
                            className={`relative group cursor-grab active:cursor-grabbing transform ${index % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-2deg]'} hover:rotate-0 transition-transform duration-300 z-10 hover:z-20`}
                        >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#8b0000] shadow shadow-black/50 z-20 border border-white/20"></div>
                            <div className="bg-[#f0f0f0] p-2 pb-4 rounded shadow-polaroid">
                                <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden relative shadow-inner mb-2 rounded filter sepia-[0.2] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#dc2828]/50 text-4xl">article</span>
                                </div>
                                <div className="text-center px-1">
                                    <h4 className="font-[family-name:var(--font-playfair)] text-gray-900 text-xs font-bold uppercase tracking-wider truncate">{clue.title}</h4>
                                    <p className="font-mono text-[9px] text-gray-500 mt-0.5 line-clamp-2">{clue.description}</p>
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
            </section>

            {/* Evidence Lab */}
            <div className="bg-gradient-to-br from-[#1a1212]/90 to-[#0f0a0a] p-6 rounded-2xl border border-white/10 col-span-full mt-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4af37]/5 rounded-full blur-3xl"></div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#d4af37]/20 rounded-xl">
                        <span className="material-symbols-outlined text-[#d4af37] text-2xl">science</span>
                    </div>
                    <div>
                        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-white">Kanıt Laboratuvarı</h2>
                        <p className="text-xs text-white/50">İki kanıtı birleştirerek yeni bulgular keşfedin</p>
                    </div>
                </div>

                <div className="bg-black/40 p-5 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        {/* First Clue Slot */}
                        <div className="flex-1 h-28 border-2 border-dashed border-[#d4af37]/30 rounded-xl flex items-center justify-center relative bg-black/30 hover:border-[#d4af37]/50 transition-colors">
                            {selectedLabClues[0] ? (
                                <div className="p-3 text-center">
                                    <span className="material-symbols-outlined text-[#d4af37] text-2xl mb-1">article</span>
                                    <p className="text-sm font-bold text-white mb-2">{selectedLabClues[0].title}</p>
                                    <button
                                        onClick={() => onRemoveFromLab(0)}
                                        className="text-xs text-[#dc2828] hover:text-[#dc2828]/80 flex items-center gap-1 mx-auto"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                        Kaldır
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-white/20 text-3xl">add_circle</span>
                                    <p className="text-xs text-white/40 mt-1">1. Kanıt</p>
                                </div>
                            )}
                        </div>

                        {/* Plus Icon */}
                        <div className="p-2 bg-[#d4af37]/20 rounded-full">
                            <span className="material-symbols-outlined text-[#d4af37]">add</span>
                        </div>

                        {/* Second Clue Slot */}
                        <div className="flex-1 h-28 border-2 border-dashed border-[#d4af37]/30 rounded-xl flex items-center justify-center relative bg-black/30 hover:border-[#d4af37]/50 transition-colors">
                            {selectedLabClues[1] ? (
                                <div className="p-3 text-center">
                                    <span className="material-symbols-outlined text-[#d4af37] text-2xl mb-1">article</span>
                                    <p className="text-sm font-bold text-white mb-2">{selectedLabClues[1].title}</p>
                                    <button
                                        onClick={() => onRemoveFromLab(1)}
                                        className="text-xs text-[#dc2828] hover:text-[#dc2828]/80 flex items-center gap-1 mx-auto"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                        Kaldır
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-white/20 text-3xl">add_circle</span>
                                    <p className="text-xs text-white/40 mt-1">2. Kanıt</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onCombineClues}
                        disabled={!selectedLabClues[0] || !selectedLabClues[1]}
                        className="w-full py-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#e5c048] hover:to-[#d4af37] text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">biotech</span>
                        ANALİZ ET
                    </button>
                </div>
            </div>

            {/* Discovered Clues (Analysis Results) */}
            {discoveredClues.length > 0 && (
                <div className="col-span-full space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#d4af37]">labs</span>
                        <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider">Laboratuvar Sonuçları</h3>
                    </div>
                    {discoveredClues.map(clue => (
                        <div key={clue.id} className="bg-gradient-to-br from-[#1a1a0a]/80 to-[#0f0a0a] p-5 rounded-xl border border-[#d4af37]/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#d4af37]/10 rounded-full blur-2xl"></div>
                            <div className="flex justify-between items-start mb-3 relative">
                                <h3 className="font-bold text-[#d4af37] text-lg">{clue.title}</h3>
                                <span className="text-[10px] bg-[#d4af37]/20 text-[#d4af37] px-3 py-1 rounded-full font-bold uppercase">Analiz</span>
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed relative">
                                {clue.description}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 flex justify-center">
                <button
                    onClick={() => {
                        playSound('click');
                        onAccuse();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-red-900/20 transition-all transform hover:scale-105"
                    onMouseEnter={() => playSound('hover')}
                >
                    KATİLİ SUÇLA
                </button>
            </div>
        </div>
    );
});
