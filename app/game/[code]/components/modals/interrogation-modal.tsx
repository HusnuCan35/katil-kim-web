import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '@/lib/animations';
import { Suspect, Case } from '@/types';
import { getCharacterPhoto } from '@/lib/game-utils';
import Image from 'next/image';

interface InterrogationModalProps {
    isOpen: boolean;
    onClose: () => void;
    suspect: Suspect | null;
    shuffledSuspects: Suspect[];
    log: { question: string, response: string }[];
    setLog: (log: { question: string, response: string }[]) => void;
    gameCase: Case;
}

export function InterrogationModal({ isOpen, onClose, suspect, shuffledSuspects, log, setLog, gameCase }: InterrogationModalProps) {
    if (!suspect) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 bg-[#0f0a0a] z-50 overflow-hidden"
                >
                    {/* Background Ambient */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#dc2828]/5 rounded-full blur-[150px]"></div>
                    </div>

                    {/* Top Navigation Bar */}
                    <div className="absolute top-0 left-0 w-full z-50 px-6 py-5 flex justify-between items-center">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            <span className="text-sm font-medium">Geri</span>
                        </button>
                        <div className="flex items-center gap-2 bg-[#dc2828]/20 px-3 py-1.5 rounded-full">
                            <div className="size-2 bg-[#dc2828] rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold tracking-wide text-[#dc2828]">KAYIT</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="absolute inset-0 z-10 pt-20 pb-6 px-6 overflow-y-auto">
                        {/* Suspect Header Card */}
                        <div className="bg-gradient-to-br from-[#1a1212] to-[#0f0a0a] rounded-3xl p-6 mb-6 border border-white/5 relative overflow-hidden">
                            {/* Character Avatar */}
                            {/* Character Photo Background Effect */}
                            <div className="absolute top-0 right-0 w-2/3 h-full opacity-20 mask-image-gradient">
                                <Image
                                    src={getCharacterPhoto(suspect.id, suspect.name, shuffledSuspects.indexOf(suspect))}
                                    alt={suspect.name}
                                    fill
                                    className="object-cover object-top mix-blend-overlay"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            </div>

                            <div className="relative z-10">
                                {/* Name & Badge */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white mb-1">
                                            {suspect.name}
                                        </h1>
                                        <p className="text-sm text-white/40 font-mono">
                                            Dosya #{suspect.id.toUpperCase().slice(0, 8)}
                                        </p>
                                    </div>
                                    <div className="bg-[#dc2828]/20 px-3 py-1 rounded-full border border-[#dc2828]/30">
                                        <span className="text-xs font-bold text-[#dc2828] uppercase">Şüpheli</span>
                                    </div>
                                </div>

                                {/* Bio */}
                                <p className="text-white/70 text-base leading-relaxed mb-5">
                                    {suspect.bio}
                                </p>

                                {/* Trait Chips */}
                                <div className="flex flex-wrap gap-2">
                                    {suspect.motive && (
                                        <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-[#dc2828]/10 border border-[#dc2828]/20 max-w-full">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#dc2828] text-xl">warning</span>
                                                <span className="text-xs font-bold text-[#dc2828] uppercase">Olası Sebep</span>
                                            </div>
                                            <p className="text-sm text-white/80 italic">"{suspect.motive}"</p>
                                        </div>
                                    )}
                                    {suspect.relationships && suspect.relationships.length > 0 && (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                            <span className="material-symbols-outlined text-white/60 text-xl">group</span>
                                            <span className="text-sm font-medium text-white/90">{suspect.relationships.length} İlişki</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                        <span className="material-symbols-outlined text-white/60 text-xl">chat</span>
                                        <span className="text-sm font-medium text-white/90">{suspect.dialogues.length} Soru</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Bio Section */}
                        {suspect.detailed_bio && (
                            <div className="bg-[#1a1212]/80 rounded-2xl p-5 mb-6 border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[#d4af37] text-xl">description</span>
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Detaylı Bilgi</h3>
                                </div>
                                <p className="text-white/80 text-base leading-relaxed">{suspect.detailed_bio}</p>
                            </div>
                        )}

                        {/* Relationships Section */}
                        {suspect.relationships && suspect.relationships.length > 0 && (
                            <div className="bg-[#1a1212]/80 rounded-2xl p-5 mb-6 border border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-[#d4af37] text-xl">hub</span>
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">İlişki Ağı</h3>
                                </div>
                                <div className="grid gap-3">
                                    {suspect.relationships.map((rel: any, idx: number) => {
                                        const targetSuspect = gameCase.suspects.find(s => s.id === rel.target_id);
                                        const isEnemy = rel.type.toLowerCase().includes('düşman') || rel.type.toLowerCase().includes('rakip');
                                        const isLove = rel.type.toLowerCase().includes('aşk') || rel.type.toLowerCase().includes('platonik');
                                        const bgColor = isEnemy ? 'bg-[#dc2828]/10' : isLove ? 'bg-pink-500/10' : 'bg-white/5';
                                        const borderColor = isEnemy ? 'border-[#dc2828]/30' : isLove ? 'border-pink-500/30' : 'border-white/10';
                                        const textColor = isEnemy ? 'text-[#dc2828]' : isLove ? 'text-pink-400' : 'text-[#d4af37]';

                                        return (
                                            <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl ${bgColor} border ${borderColor}`}>
                                                <div className="size-12 rounded-full bg-black/30 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white/60 text-2xl">person</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-white text-base">{targetSuspect?.name || 'Bilinmiyor'}</p>
                                                    <p className={`text-sm font-medium ${textColor}`}>{rel.type}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Interrogation Section */}
                        <div className="bg-[#1a1212]/80 rounded-2xl p-5 mb-6 border border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-[#dc2828] text-xl">record_voice_over</span>
                                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Sorgulama</h3>
                            </div>

                            {/* Chat Log */}
                            {log.length > 0 && (
                                <div className="mb-5 space-y-4">
                                    {log.map((entry, index) => (
                                        <div key={index} className="space-y-3">
                                            {/* Detective Question */}
                                            <div className="flex justify-end">
                                                <div className="max-w-[85%]">
                                                    <div className="bg-white/10 text-white p-4 rounded-2xl rounded-tr-md border border-white/5">
                                                        <p className="text-base leading-relaxed">{entry.question}</p>
                                                    </div>
                                                    <p className="text-xs text-white/30 text-right mt-1.5">Dedektif</p>
                                                </div>
                                            </div>
                                            {/* Suspect Response */}
                                            <div className="flex justify-start">
                                                <div className="max-w-[85%]">
                                                    <div className="bg-[#2a1515] text-white p-4 rounded-2xl rounded-tl-md border-l-2 border-[#dc2828]">
                                                        <p className="text-base leading-relaxed">{entry.response}</p>
                                                    </div>
                                                    <p className="text-xs text-white/30 mt-1.5">{suspect.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Questions List */}
                            <div className="space-y-2">
                                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">
                                    {log.length === 0 ? 'Bir soru seçerek sorgulamaya başlayın' : 'Daha fazla soru sorun'}
                                </p>
                                {suspect.dialogues.map((q) => (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setLog([...log, { question: q.text, response: q.response }]);
                                        }}
                                        className="w-full bg-black/30 hover:bg-white/5 text-white p-4 rounded-xl flex items-center gap-3 border border-white/5 hover:border-white/10 transition-all active:scale-[0.99] text-left group"
                                    >
                                        <span className="material-symbols-outlined text-[#dc2828] text-xl group-hover:scale-110 transition-transform">help</span>
                                        <span className="flex-1 text-base text-white/80 group-hover:text-white transition-colors">{q.text}</span>
                                        <span className="material-symbols-outlined text-white/20 group-hover:text-white/50 transition-colors">chevron_right</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Spacing */}
                        <div className="h-8"></div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
