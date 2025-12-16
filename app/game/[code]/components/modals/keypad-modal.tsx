import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp } from '@/lib/animations';
import { Clue } from '@/types';
import { useState, useEffect } from 'react';

interface KeypadModalProps {
    isOpen: boolean;
    onClose: () => void;
    clue: Clue | null;
    onUnlock: (clueId: string) => void;
}

export function KeypadModal({ isOpen, onClose, clue, onUnlock }: KeypadModalProps) {
    const [keypadInput, setKeypadInput] = useState('');

    useEffect(() => {
        if (!isOpen) setKeypadInput('');
    }, [isOpen]);

    if (!clue) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                >
                    <motion.div
                        variants={scaleUp}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full"
                    >
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-red-500">Şifre Girin</h2>
                            <p className="text-neutral-500 text-sm mt-1">{clue.title}</p>
                        </div>

                        <div className="bg-neutral-950 p-4 rounded-xl mb-6 text-center">
                            <span className="text-3xl font-mono tracking-[0.5em] text-white">
                                {keypadInput.padEnd(4, '_')}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setKeypadInput(prev => (prev.length < 4 ? prev + num : prev))}
                                    className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xl font-bold transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => setKeypadInput('')}
                                className="p-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl font-bold transition-colors"
                            >
                                C
                            </button>
                            <button
                                onClick={() => setKeypadInput(prev => (prev.length < 4 ? prev + 0 : prev))}
                                className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xl font-bold transition-colors"
                            >
                                0
                            </button>
                            <button
                                onClick={() => {
                                    if (keypadInput === clue.locked_with_code) {
                                        onUnlock(clue.id);
                                        onClose();
                                    } else {
                                        alert('Yanlış Şifre!');
                                        setKeypadInput('');
                                    }
                                }}
                                className="p-4 bg-green-600 hover:bg-green-700 rounded-xl font-bold transition-colors"
                            >
                                OK
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 text-neutral-500 hover:text-white transition-colors"
                        >
                            Kapat
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
