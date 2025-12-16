'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clue, Suspect } from '@/types';
import { motion } from 'framer-motion';
import { fadeIn } from '@/lib/animations';
import { useSound } from '@/hooks/use-sound';

// Hooks
import { useGameData } from './hooks/use-game-data';
import { useChat } from './hooks/use-chat';

// Components
import { GameHeader } from './components/game-header';
import { StoryIntro } from './components/story-intro';
import { SuspectsGallery } from './components/suspects-gallery';
import { EvidenceBoard } from './components/evidence-board';
import { SharedBoard } from './components/shared-board';
import { TimelineBuilder } from './components/timeline-builder';

// Modals
import { KeypadModal } from './components/modals/keypad-modal';
import { InterrogationModal } from './components/modals/interrogation-modal';
import { AccusationModal } from './components/modals/accusation-modal';
import { ChatModal } from './components/modals/chat-modal';
import { GameOutcomeModal } from './components/modals/game-outcome-modal';

export default function GamePage() {
    const params = useParams();
    const code = params?.code as string;
    const { playSound } = useSound();

    // Custom Hooks
    const {
        room, players, gameCase, shuffledSuspects, roomOutcome,
        playerId, playerRole, playerName,
        myClues, setMyClues, sharedClues,
        myVotes,
        timeLeft, loading, timelineEvents, setTimelineEvents
    } = useGameData(code);

    // UI State
    const [showIntro, setShowIntro] = useState(true);
    const [showChatModal, setShowChatModal] = useState(false);
    const [notes, setNotes] = useState('');

    // Chat Hook
    const {
        messages, unreadMessages, setUnreadMessages, handleSendMessage
    } = useChat(room, playerId, playerName, showChatModal);

    // Interaction State
    const [selectedSuspectForInterrogation, setSelectedSuspectForInterrogation] = useState<Suspect | null>(null);
    const [showInterrogationModal, setShowInterrogationModal] = useState(false);
    const [interrogationLog, setInterrogationLog] = useState<{ question: string, response: string }[]>([]);

    const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null); // For Accusation
    const [showAccusationModal, setShowAccusationModal] = useState(false);

    const [showKeypadModal, setShowKeypadModal] = useState(false);
    const [selectedClueForUnlock, setSelectedClueForUnlock] = useState<Clue | null>(null);

    const [selectedCluesForLab, setSelectedCluesForLab] = useState<(Clue | null)[]>([null, null]);
    const [discoveredClues, setDiscoveredClues] = useState<Clue[]>([]);

    const [isTimelineVerified, setIsTimelineVerified] = useState(false);


    // Notes Persistence
    useEffect(() => {
        if (!code) return;
        const savedNotes = localStorage.getItem(`katil_kim_notes_${code}`);
        if (savedNotes) setNotes(savedNotes);
    }, [code]);

    useEffect(() => {
        if (code) {
            localStorage.setItem(`katil_kim_notes_${code}`, notes);
        }
    }, [notes, code]);


    // Handlers

    const handleExit = async () => {
        if (confirm("Oyundan çıkmak istediğine emin misin? Bir daha bu odaya dönemezsin.")) {
            if (playerId) {
                await supabase.from('players').delete().eq('id', playerId);
            }
            localStorage.removeItem('katil_kim_role');
            localStorage.removeItem('katil_kim_name');
            localStorage.removeItem('katil_kim_id');
            window.location.href = '/';
        }
    };

    const handleCombineClues = () => {
        const [c1, c2] = selectedCluesForLab;
        if (!c1 || !c2) return;

        const combination = gameCase.evidence_combinations.find(
            (ec: any) => (ec.clue_id_1 === c1.id && ec.clue_id_2 === c2.id) ||
                (ec.clue_id_1 === c2.id && ec.clue_id_2 === c1.id)
        );

        if (combination) {
            if (discoveredClues.some(c => c.id === combination.result_clue.id)) {
                alert("Bu analizi zaten yaptınız.");
                setSelectedCluesForLab([null, null]);
                return;
            }

            alert(`EŞLEŞME BULUNDU!\n\n${combination.result_clue.title}\n${combination.result_clue.description}`);
            setDiscoveredClues([...discoveredClues, combination.result_clue]);
            setSelectedCluesForLab([null, null]);
        } else {
            alert("Bu iki kanıt arasında bir bağlantı bulunamadı.");
            setSelectedCluesForLab([null, null]);
        }
    };

    const checkTimeline = () => {
        const isCorrect = timelineEvents.every((event, index) => event.correct_order === index + 1);
        if (isCorrect) {
            setIsTimelineVerified(true);
            alert("Doğru Sıralama! Olayların akışı çözüldü.");
        } else {
            alert("Sıralama Yanlış. İpuçlarını tekrar inceleyin.");
        }
    };

    const handleAccusation = async () => {
        if (!selectedSuspect || !playerId || !room) return;

        try {
            // Re-fetch current room to get latest votes/status
            const { data: currentRoom, error: fetchError } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', room.id)
                .single();

            if (fetchError || !currentRoom) {
                alert("Oda verisi alınamadı.");
                return;
            }

            // Get active players
            const { data: activePlayers } = await supabase
                .from('players')
                .select('id')
                .eq('room_id', room.id);

            if (!activePlayers) return;

            const activePlayerIds = activePlayers.map(p => p.id);
            const currentVotes = currentRoom.votes || {};
            const validVotes: Record<string, string> = {};

            // Filter ghost votes
            Object.entries(currentVotes).forEach(([pid, vote]) => {
                if (activePlayerIds.includes(pid)) {
                    validVotes[pid] = vote as string;
                }
            });

            // Add MY vote
            validVotes[playerId] = selectedSuspect.id;

            // Check Consensus
            const totalActivePlayers = activePlayerIds.length;
            const totalValidVotes = Object.keys(validVotes).length;

            let outcome = null;
            let status = currentRoom.status;

            if (totalValidVotes >= totalActivePlayers) {
                const voteValues = Object.values(validVotes);
                const firstVote = voteValues[0];
                const allAgreed = voteValues.every(v => v === firstVote);

                if (allAgreed) {
                    status = 'FINISHED';
                    const killerId = gameCase.solution.killer_id;
                    outcome = firstVote === killerId ? 'WON' : 'LOST';
                }
            }

            const { error: updateError } = await supabase
                .from('rooms')
                .update({
                    votes: validVotes,
                    outcome: outcome,
                    status: status,
                    finished_at: status === 'FINISHED' ? new Date().toISOString() : null
                })
                .eq('id', room.id);

            if (updateError) {
                alert("Oylama kaydedilemedi.");
            } else {
                setShowAccusationModal(false);
            }

        } catch (err) {
            console.error(err);
            alert("Bir hata oluştu.");
        }
    };


    if (loading) {
        return (
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="min-h-screen bg-pattern flex items-center justify-center"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-[#333] rounded-full animate-spin border-t-[#dc2828]"></div>
                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#dc2828] text-2xl">fingerprint</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Dosyalar yükleniyor...</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.main
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="min-h-screen bg-pattern text-white p-4 md:p-8 relative overflow-hidden"
        >
            <StoryIntro show={showIntro} onClose={() => setShowIntro(false)} gameCase={gameCase} />

            <GameHeader
                gameCase={gameCase}
                timeLeft={timeLeft}
                playerRole={playerRole}
                onExit={handleExit}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 pt-8 max-w-7xl mx-auto">
                <SuspectsGallery
                    suspects={shuffledSuspects}
                    onSelect={(suspect) => {
                        setSelectedSuspectForInterrogation(suspect);
                        setInterrogationLog([]);
                        setShowInterrogationModal(true);
                    }}
                />

                <EvidenceBoard
                    clues={myClues}
                    selectedLabClues={selectedCluesForLab}
                    onAddToLab={(clue) => {
                        if (!selectedCluesForLab[0]) setSelectedCluesForLab([clue, selectedCluesForLab[1]]);
                        else if (!selectedCluesForLab[1]) setSelectedCluesForLab([selectedCluesForLab[0], clue]);
                        else alert("Laboratuvar dolu. Önce birini çıkarın.");
                    }}
                    onUnlockRequest={(clue) => {
                        setSelectedClueForUnlock(clue);
                        setShowKeypadModal(true);
                    }}
                />

                <SharedBoard
                    sharedClues={sharedClues}
                    selectedLabClues={selectedCluesForLab}
                    discoveredClues={discoveredClues}
                    onAddToLab={(clue) => {
                        if (!selectedCluesForLab[0]) setSelectedCluesForLab([clue, selectedCluesForLab[1]]);
                        else if (!selectedCluesForLab[1]) setSelectedCluesForLab([selectedCluesForLab[0], clue]);
                        else alert("Laboratuvar dolu. Önce birini çıkarın.");
                    }}
                    onRemoveFromLab={(index) => {
                        const newLab = [...selectedCluesForLab];
                        newLab[index] = null;
                        setSelectedCluesForLab(newLab);
                    }}
                    onCombineClues={handleCombineClues}
                    onAccuse={() => setShowAccusationModal(true)}
                />

                {/* Right Column (Timeline - moved or integrated) -> Wait, original design had 3 cols: Evidence(4), Shared(5), Timeline? 
                    Original grid: 
                    Left: Evidence (col-span-4)
                    Middle: Shared & Lab (col-span-5)
                    Right: Timeline (Implicitly col-span-3 since 4+5=9, 12-9=3)
                */}
                <div className="lg:col-span-3">
                    <TimelineBuilder
                        events={timelineEvents}
                        setEvents={setTimelineEvents}
                        isVerified={isTimelineVerified}
                        onCheck={checkTimeline}
                    />
                </div>
            </div>

            {/* Floating Chat Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => {
                        setShowChatModal(true);
                        setUnreadMessages(0);
                    }}
                    className="relative bg-gradient-to-br from-[#d4af37] to-[#b8860b] hover:from-[#e5c048] hover:to-[#d4af37] text-black p-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#d4af37]/50 transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(212,175,55,0.6)]"
                >
                    <span className="material-symbols-outlined text-2xl">chat</span>
                    {unreadMessages > 0 && (
                        <span className="absolute -top-2 -right-2 bg-[#dc2828] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full animate-bounce shadow-[0_0_10px_rgba(220,40,40,0.5)]">
                            {unreadMessages}
                        </span>
                    )}
                </button>
            </div>

            {/* Modals */}
            <KeypadModal
                isOpen={showKeypadModal}
                onClose={() => setShowKeypadModal(false)}
                clue={selectedClueForUnlock}
                onUnlock={(clueId) => {
                    const updatedClues = myClues.map(c =>
                        c.id === clueId
                            ? { ...c, is_locked: false, description: 'ŞİFRE ÇÖZÜLDÜ: Mesajlarda "Borcu bu gece ödeyeceğim, merak etme" yazıyor.' }
                            : c
                    );
                    setMyClues(updatedClues);
                }}
            />

            <InterrogationModal
                isOpen={showInterrogationModal}
                onClose={() => setShowInterrogationModal(false)}
                suspect={selectedSuspectForInterrogation}
                shuffledSuspects={shuffledSuspects}
                log={interrogationLog}
                setLog={setInterrogationLog}
                gameCase={gameCase}
            />

            <AccusationModal
                isOpen={showAccusationModal}
                onClose={() => setShowAccusationModal(false)}
                suspects={shuffledSuspects}
                selectedSuspect={selectedSuspect}
                setSelectedSuspect={setSelectedSuspect}
                myVotes={myVotes}
                players={players}
                playerId={playerId}
                gameCase={gameCase}
                onAccuse={handleAccusation}
            />

            <ChatModal
                isOpen={showChatModal}
                onClose={() => setShowChatModal(false)}
                messages={messages}
                playerId={playerId}
                onSendMessage={handleSendMessage}
                notes={notes}
                setNotes={setNotes}
            />

            <GameOutcomeModal
                outcome={roomOutcome}
                gameCase={gameCase}
                players={players}
                myVotes={myVotes}
                shuffledSuspects={shuffledSuspects}
            />

        </motion.main>
    );
}
