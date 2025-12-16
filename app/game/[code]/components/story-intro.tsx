import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp } from '@/lib/animations';
import { Case } from '@/types';
import { useSound } from '@/hooks/use-sound';

interface StoryIntroProps {
    show: boolean;
    onClose: () => void;
    gameCase: Case;
}

export function StoryIntro({ show, onClose, gameCase }: StoryIntroProps) {
    const { playSound } = useSound();

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
                >
                    <motion.div
                        variants={scaleUp}
                        initial="hidden"
                        animate="visible"
                        className="max-w-2xl w-full text-center space-y-8"
                    >
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 bg-[#dc2828]/10 border border-[#dc2828]/30 px-4 py-1.5 rounded-full text-sm text-[#ff4d4d]">
                                <span className="material-symbols-outlined text-base animate-pulse">folder_open</span>
                                <span>Dosya #{gameCase.id.toUpperCase()}</span>
                            </div>
                            <h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl font-bold text-gradient tracking-tight">
                                {gameCase.title}
                            </h1>
                            <div className="h-px bg-gradient-to-r from-transparent via-[#dc2828] to-transparent w-full" />
                        </div>

                        <div className="glass-card p-8 rounded-3xl border border-[#333] shadow-2xl">
                            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-[family-name:var(--font-playfair)] italic">
                                "{gameCase.intro}"
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => {
                                    playSound('click');
                                    onClose();
                                }}
                                className="group relative px-8 py-4 bg-gradient-to-r from-[#8b0000] to-[#dc2828] hover:from-[#a00] hover:to-[#e63333] text-white font-bold text-lg rounded-xl transition-all hover:scale-105 shadow-neon border border-[#dc2828]/30"
                                onMouseEnter={() => playSound('hover')}
                            >
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 rounded-xl overflow-hidden"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    <span className="material-symbols-outlined">search</span>
                                    Vakayı İncele
                                </span>
                            </button>
                            <p className="mt-4 text-gray-500 text-sm animate-pulse flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">military_tech</span>
                                Dedektif, göreve hazır mısın?
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
