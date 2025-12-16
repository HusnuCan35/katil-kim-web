import { motion } from 'framer-motion';
import { containerStagger, listItem } from '@/lib/animations';
import { getCharacterPhoto } from '@/lib/game-utils';
import { Suspect } from '@/types';
import { useSound } from '@/hooks/use-sound';
import { memo } from 'react';
import Image from 'next/image';

interface SuspectsGalleryProps {
    suspects: Suspect[];
    onSelect: (suspect: Suspect) => void;
}

export const SuspectsGallery = memo(function SuspectsGallery({ suspects, onSelect }: SuspectsGalleryProps) {
    const { playSound } = useSound();

    return (
        <div className="lg:col-span-12">
            <section>
                <div className="flex justify-between items-end mb-3">
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg text-white font-bold flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#dc2828] rounded-full"></span>
                        Şüpheliler
                    </h3>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{suspects.length} KİŞİ</span>
                </div>
                <div className="w-full overflow-x-auto hide-scrollbar -mx-4 px-4 pb-4">
                    <motion.div
                        variants={containerStagger}
                        initial="hidden"
                        animate="visible"
                        className="flex gap-4"
                    >
                        {suspects.map((suspect, index) => (
                            <motion.button
                                variants={listItem}
                                key={suspect.id}
                                onClick={() => {
                                    playSound('click');
                                    onSelect(suspect);
                                }}
                                onMouseEnter={() => playSound('hover')}
                                className={`flex flex-col w-24 shrink-0 gap-1 group cursor-pointer ${index % 2 === 0 ? 'rotate-[-2deg]' : 'rotate-[1deg]'} hover:rotate-0 transition-transform duration-300`}
                            >
                                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-[#333] shadow-lg group-hover:border-[#dc2828]/50 group-hover:shadow-[0_0_15px_rgba(220,40,40,0.3)] transition-all">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
                                    <Image
                                        src={getCharacterPhoto(suspect.id, suspect.name, index)}
                                        alt={suspect.name}
                                        fill
                                        sizes="(max-width: 768px) 100px, 150px"
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                    <span className="absolute bottom-1.5 left-0 right-0 text-center text-white font-[family-name:var(--font-playfair)] text-xs z-20 font-bold drop-shadow-lg">{suspect.name}</span>
                                    <div className="absolute top-1.5 right-1.5 z-20">
                                        <span className="material-symbols-outlined text-gray-500 group-hover:text-[#dc2828] text-sm transition-colors">chat_bubble</span>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            </section>
        </div>
    );
});
