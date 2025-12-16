import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp } from '@/lib/animations';
import { Case, Player } from '@/types';
import { getCharacterPhoto } from '@/lib/game-utils';
import Image from 'next/image';

interface GameOutcomeModalProps {
    outcome: 'WON' | 'LOST' | null;
    gameCase: Case;
    players: Player[];
    myVotes: Record<string, string>;
    shuffledSuspects: any[]; // Or Suspect[] if type is available
}

export function GameOutcomeModal({ outcome, gameCase, players, myVotes, shuffledSuspects }: GameOutcomeModalProps) {
    if (!outcome) return null;

    return (
        <AnimatePresence>
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 bg-[#0f0a0a] flex items-center justify-center p-4 z-50 overflow-y-auto"
            >
                {/* Ambient Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[200px] ${outcome === 'WON' ? 'bg-[#22c55e]/20' : 'bg-[#dc2828]/20'}`}></div>
                </div>

                <motion.div
                    variants={scaleUp}
                    initial="hidden"
                    animate="visible"
                    className="text-center space-y-6 max-w-lg w-full relative z-10 py-8"
                >
                    {outcome === 'WON' ? (
                        <>
                            {/* Victory Icon */}
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-[#22c55e]/20 rounded-full mb-4 border border-[#22c55e]/30 mx-auto">
                                <span className="material-symbols-outlined text-[#22c55e] text-5xl">trophy</span>
                            </div>
                            <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-black text-[#22c55e] tracking-tight mb-2">TEBRİKLER!</h1>
                            <p className="text-xl text-white/70">Katili başarıyla yakaladınız.</p>

                            {/* Killer Reveal Card */}
                            <div className="bg-gradient-to-br from-[#1a2a1a]/90 to-[#0f0a0a] p-6 rounded-2xl border border-[#22c55e]/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#22c55e]/10 rounded-full blur-3xl"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#22c55e]/50 relative">
                                        <Image
                                            src={getCharacterPhoto(gameCase.solution.killer_id, gameCase.solution.killer_name, shuffledSuspects.findIndex(s => s.id === gameCase.solution.killer_id))}
                                            alt={gameCase.solution.killer_name}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm text-[#22c55e] uppercase tracking-wider font-bold mb-1">Katil Yakalandı</p>
                                        <p className="text-2xl font-bold text-white">{gameCase.solution.killer_name}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-[#22c55e]/20 relative z-10">
                                    <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Motiv</p>
                                    <p className="text-white/80 italic">"{gameCase.solution.motive}"</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Defeat Icon */}
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-[#dc2828]/20 rounded-full mb-4 border border-[#dc2828]/30 mx-auto">
                                <span className="material-symbols-outlined text-[#dc2828] text-5xl">sentiment_dissatisfied</span>
                            </div>
                            <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-black text-[#dc2828] tracking-tight mb-2">OYUN BİTTİ</h1>
                            <p className="text-xl text-white/70">Yanlış kişiyi suçladınız. Katil kaçtı!</p>

                            {/* Killer Reveal Card */}
                            <div className="bg-gradient-to-br from-[#2a1a1a]/90 to-[#0f0a0a] p-6 rounded-2xl border border-[#dc2828]/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#dc2828]/10 rounded-full blur-3xl"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#dc2828]/50 relative">
                                        <Image
                                            src={getCharacterPhoto(gameCase.solution.killer_id, gameCase.solution.killer_name, shuffledSuspects.findIndex(s => s.id === gameCase.solution.killer_id))}
                                            alt={gameCase.solution.killer_name}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm text-[#dc2828] uppercase tracking-wider font-bold mb-1">Gerçek Katil</p>
                                        <p className="text-2xl font-bold text-white">{gameCase.solution.killer_name}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-[#dc2828]/20 relative z-10">
                                    <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Motiv</p>
                                    <p className="text-white/80 italic">"{gameCase.solution.motive}"</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Voting Summary */}
                    <div className="bg-gradient-to-br from-[#1a1212]/90 to-[#0f0a0a] p-5 rounded-2xl border border-white/10 space-y-3 text-left">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-[#d4af37]">how_to_vote</span>
                            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Kim Kimi Suçladı?</h3>
                        </div>
                        <div className="space-y-2">
                            {players.map(p => {
                                const voteId = myVotes[p.id];
                                const votedSuspect = voteId ? gameCase.suspects.find((s: any) => s.id === voteId) : null;
                                const isKiller = votedSuspect?.id === gameCase.solution.killer_id;

                                return (
                                    <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl ${isKiller ? 'bg-[#22c55e]/10 border border-[#22c55e]/20' : 'bg-black/30 border border-white/5'}`}>
                                        <span className="font-bold text-white/80">{p.name}</span>
                                        <div className="flex items-center gap-2">
                                            {votedSuspect ? (
                                                <>
                                                    <span className={`font-bold ${isKiller ? 'text-[#22c55e]' : 'text-[#dc2828]'}`}>
                                                        {votedSuspect.name}
                                                    </span>
                                                    {isKiller ? (
                                                        <span className="material-symbols-outlined text-[#22c55e] text-lg">check_circle</span>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[#dc2828] text-lg">cancel</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-white/30 italic text-sm">Oy Kullanmadı</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Return Button */}
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-6 w-full py-4 bg-gradient-to-r from-white to-white/90 text-black font-bold rounded-xl hover:from-white/90 hover:to-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">home</span>
                        Ana Menüye Dön
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
