import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp } from '@/lib/animations';
import { Suspect, Player, Case } from '@/types';
import { getCharacterPhoto } from '@/lib/game-utils';
import Image from 'next/image';

interface AccusationModalProps {
    isOpen: boolean;
    onClose: () => void;
    suspects: Suspect[];
    selectedSuspect: Suspect | null;
    setSelectedSuspect: (suspect: Suspect | null) => void;
    myVotes: Record<string, string>;
    players: Player[];
    playerId: string | null;
    gameCase: Case;
    onAccuse: () => void;
}

export function AccusationModal({
    isOpen,
    onClose,
    suspects,
    selectedSuspect,
    setSelectedSuspect,
    myVotes,
    players,
    playerId,
    gameCase,
    onAccuse
}: AccusationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 bg-[#0f0a0a]/95 backdrop-blur-md flex items-center justify-center p-4 z-50"
                >
                    {/* Ambient Background */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#dc2828]/10 rounded-full blur-[150px]"></div>
                    </div>

                    <motion.div
                        variants={scaleUp}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-gradient-to-br from-[#1a1212] to-[#0f0a0a] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-6 relative overflow-hidden shadow-2xl"
                    >
                        {/* Decorative Corner */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#dc2828]/10 rounded-full blur-2xl"></div>

                        {/* Header */}
                        <div className="text-center relative z-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#dc2828]/20 rounded-2xl mb-4 border border-[#dc2828]/30">
                                <span className="material-symbols-outlined text-[#dc2828] text-3xl">gavel</span>
                            </div>
                            <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white mb-2">Katil Kim?</h2>
                            <p className="text-white/50 text-sm">Yanlış kişiyi suçlarsan katil kaçacak!</p>
                        </div>

                        {/* Suspect Selection Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {suspects.map((s: any) => {
                                const voteCount = Object.values(myVotes || {}).filter(v => v === s.id).length;
                                const isSelected = selectedSuspect?.id === s.id;

                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSuspect(s)}
                                        className={`p-4 rounded-xl border text-left transition-all relative group ${isSelected
                                            ? 'bg-[#dc2828]/20 border-[#dc2828] shadow-[0_0_20px_rgba(220,40,40,0.3)]'
                                            : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded-full overflow-hidden border border-white/20 relative"
                                            >
                                                <Image
                                                    src={getCharacterPhoto(s.id, s.name, suspects.indexOf(s))}
                                                    alt={s.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="48px"
                                                />
                                            </div>
                                            <span className={`font-bold text-base ${isSelected ? 'text-white' : 'text-white/80'}`}>{s.name}</span>
                                        </div>
                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2">
                                                <span className="material-symbols-outlined text-[#dc2828] text-lg">check_circle</span>
                                            </div>
                                        )}
                                        {/* Vote Count Indicator */}
                                        {voteCount > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-[#d4af37] text-black text-[10px] px-2 py-1 rounded-full font-bold shadow-lg z-10">
                                                {voteCount} OY
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Voting Status */}
                        {players.length > 0 && (
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[#d4af37]">how_to_vote</span>
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Oylama Durumu</h3>
                                </div>
                                <div className="space-y-2">
                                    {players.map(p => {
                                        const voteId = myVotes ? myVotes[p.id] : null;
                                        const votedSuspect = voteId ? gameCase.suspects.find((s: any) => s.id === voteId) : null;
                                        const isMe = p.id === playerId;

                                        return (
                                            <div key={p.id} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${votedSuspect ? 'bg-[#22c55e]' : 'bg-white/20 animate-pulse'}`}></div>
                                                    <span className={`font-medium ${isMe ? 'text-[#dc2828]' : 'text-white/70'}`}>
                                                        {p.name} {isMe && <span className="text-white/40">(Sen)</span>}
                                                    </span>
                                                </div>
                                                <div>
                                                    {votedSuspect ? (
                                                        <span className="text-[#d4af37] font-bold text-sm">{votedSuspect.name}</span>
                                                    ) : (
                                                        <span className="text-white/30 italic text-sm">Düşünüyor...</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-white/30 mt-2 text-center border-t border-white/5 pt-3 uppercase tracking-wider">
                                    Tüm dedektifler oy kullandığında oyun biter
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    onClose();
                                    setSelectedSuspect(null);
                                }}
                                className="flex-1 py-4 font-semibold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center justify-center gap-2 text-white/70 hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                                İptal
                            </button>
                            <button
                                onClick={onAccuse}
                                disabled={!selectedSuspect}
                                className="flex-1 py-4 font-bold bg-gradient-to-r from-[#dc2828] to-[#b91c1c] hover:from-[#ef4444] hover:to-[#dc2828] disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 text-white rounded-xl transition-all shadow-[0_0_20px_rgba(220,40,40,0.3)] disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">gavel</span>
                                {myVotes && Object.keys(myVotes).length > 0 ? 'Oyu Değiştir' : 'Suçla'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
