'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CASE_1 } from '@/lib/game-content';
import { Clue, Role, Room, Question, TimelineEvent } from '@/types/game';
import { Loader2, Lock, Unlock, MessageSquare, Clock, ChevronUp, ChevronDown, CheckCircle2, FlaskConical, Plus, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp, slideUp, containerStagger, listItem } from '@/lib/animations';
import { useSound } from '@/hooks/use-sound';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function GamePage() {
    const { code } = useParams();
    const { playSound } = useSound();
    const [role, setRole] = useState<Role | null>(null);
    const [myClues, setMyClues] = useState<Clue[]>([]);
    const [sharedClues, setSharedClues] = useState<Clue[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInterrogationModal, setShowInterrogationModal] = useState(false);
    const [selectedSuspectForInterrogation, setSelectedSuspectForInterrogation] = useState<any>(null); // Using any for simplicity with static data
    const [interrogationLog, setInterrogationLog] = useState<{ question: string, response: string }[]>([]);
    const [activeTab, setActiveTab] = useState('Sorgu');

    // Keypad State
    const [showKeypadModal, setShowKeypadModal] = useState(false);
    const [keypadInput, setKeypadInput] = useState('');
    const [selectedClueForUnlock, setSelectedClueForUnlock] = useState<Clue | null>(null);

    const [showAccuseModal, setShowAccuseModal] = useState(false);
    const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
    const [gameState, setGameState] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
    const [myVotes, setMyVotes] = useState<Record<string, string>>({});
    const [roomOutcome, setRoomOutcome] = useState<'WON' | 'LOST' | null>(null);

    // Timeline State
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [isTimelineVerified, setIsTimelineVerified] = useState(false);

    // Evidence Lab State
    const [selectedCluesForLab, setSelectedCluesForLab] = useState<(Clue | null)[]>([null, null]);
    const [discoveredClues, setDiscoveredClues] = useState<Clue[]>([]);

    const handleCombineClues = () => {
        const [c1, c2] = selectedCluesForLab;
        if (!c1 || !c2) return;

        const combination = gameCase.evidence_combinations.find(
            (ec: any) => (ec.clue_id_1 === c1.id && ec.clue_id_2 === c2.id) ||
                (ec.clue_id_1 === c2.id && ec.clue_id_2 === c1.id)
        );

        if (combination) {
            // Check if already discovered
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

    // Timeline initialization moved to main data fetch

    const moveEvent = (index: number, direction: number) => {
        const newEvents = [...timelineEvents];
        const targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < newEvents.length) {
            [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];
            setTimelineEvents(newEvents);
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

    const [gameCase, setGameCase] = useState<any>(CASE_1);
    const [shuffledSuspects, setShuffledSuspects] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds

    useEffect(() => {
        const storedRole = localStorage.getItem('katil_kim_role') as Role;
        setRole(storedRole);

        const fetchGameData = async () => {
            // Fetch Room Data for Custom Case and Timer
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', code)
                .single();

            if (roomData) {
                // Set Case Data
                let currentCase = CASE_1;
                if (roomData.custom_case) {
                    currentCase = roomData.custom_case;
                    setGameCase(roomData.custom_case);
                }

                // Shuffle Suspects
                const suspects = [...currentCase.suspects];
                for (let i = suspects.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [suspects[i], suspects[j]] = [suspects[j], suspects[i]];
                }
                setShuffledSuspects(suspects);

                // Initialize Clues based on the current case
                if (storedRole) {
                    const my = currentCase.clues.filter((c: Clue) => c.visible_to === storedRole);
                    const shared = currentCase.clues.filter((c: Clue) => c.visible_to === 'BOTH');
                    setMyClues(my);
                    setSharedClues(shared);
                }

                // Initialize Timeline based on the current case
                const events = [...currentCase.timeline_events];
                for (let i = events.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [events[i], events[j]] = [events[j], events[i]];
                }
                setTimelineEvents(events);

                // Calculate Time Left
                if (roomData.started_at) {
                    const startTime = new Date(roomData.started_at).getTime();
                    const now = new Date().getTime();
                    const elapsedSeconds = Math.floor((now - startTime) / 1000);
                    const remaining = Math.max(0, (30 * 60) - elapsedSeconds);
                    setTimeLeft(remaining);
                }
            }
            setLoading(false);
        };

        fetchGameData();

        // Timer Interval
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Realtime Subscription for Room Updates (Votes & Outcome)
        const channel = supabase
            .channel(`room_${code}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
                const newRoom = payload.new as Room;
                if (newRoom.votes) setMyVotes(newRoom.votes);
                if (newRoom.outcome) {
                    setGameState(newRoom.outcome);
                    setRoomOutcome(newRoom.outcome);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [code]);

    const handleSuspectClick = (suspect: any) => {
        setSelectedSuspectForInterrogation(suspect);
        setInterrogationLog([]);
        setActiveTab('Profil');
        setShowInterrogationModal(true);
    };

    const handleAccusation = async () => {
        if (!selectedSuspect || !role) {
            console.error("Missing suspect or role", { selectedSuspect, role });
            return;
        }

        // 1. Get current room to see existing votes
        const { data: roomData, error: fetchError } = await supabase
            .from('rooms')
            .select('*')
            .eq('code', code)
            .single();

        if (fetchError || !roomData) {
            console.error("Error fetching room:", fetchError);
            alert("Oda bilgisi alınamadı. Lütfen sayfayı yenileyin.");
            return;
        }

        const currentVotes = roomData.votes || {};
        const newVotes = { ...currentVotes, [role]: selectedSuspect };

        // 2. Check for Consensus
        const playerAVote = newVotes['DETECTIVE_A'];
        const playerBVote = newVotes['DETECTIVE_B'];

        let outcome = null;
        let status = roomData.status;

        if (playerAVote && playerBVote && playerAVote === playerBVote) {
            // Consensus reached! Check if correct.
            status = 'FINISHED';
            outcome = playerAVote === 's3' ? 'WON' : 'LOST'; // Hardcoded killer logic
        }

        // 3. Update Room
        const { error: updateError } = await supabase
            .from('rooms')
            .update({
                votes: newVotes,
                outcome: outcome,
                status: status
            })
            .eq('code', code);

        if (updateError) {
            console.error("Error updating room:", updateError);
            alert("Oylama kaydedilemedi. Veritabanı güncellemesi eksik olabilir.");
            return;
        }

        setShowAccuseModal(false);
    };

    if (loading) {
        return (
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="min-h-screen bg-neutral-950 flex items-center justify-center"
            >
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </motion.div>
        );
    }

    return (
        <motion.main
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8"
        >
            {/* Header */}
            <header className="flex justify-between items-center mb-8 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 backdrop-blur-sm sticky top-4 z-40 shadow-xl">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl transition-colors"
                        title="Oyunu Bitir ve Çık"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-red-600 tracking-tight">{gameCase.title}</h1>
                        <p className="text-xs text-neutral-400">Vaka Dosyası #{gameCase.id.toUpperCase()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${timeLeft < 300 ? 'bg-red-900/20 border-red-900/50 text-red-500 animate-pulse' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                        <Clock className="w-5 h-5" />
                        <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-neutral-200">{role === 'DETECTIVE_A' ? 'Baş Dedektif' : 'Yardımcı'}</p>
                        <p className="text-xs text-neutral-500">Rolün</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Suspects & Interrogation */}
                <div className="md:col-span-4 space-y-6">
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Şüpheliler
                        </h2>
                        <motion.div
                            variants={containerStagger}
                            initial="hidden"
                            animate="visible"
                            className="space-y-3"
                        >
                            {shuffledSuspects.map((suspect: any) => (
                                <motion.button
                                    variants={listItem}
                                    key={suspect.id}
                                    onClick={() => {
                                        playSound('click');
                                        setSelectedSuspectForInterrogation(suspect);
                                        setShowInterrogationModal(true);
                                        setActiveTab('Sorgu');
                                    }}
                                    className="w-full text-left p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all group"
                                    onMouseEnter={() => playSound('hover')}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold group-hover:text-red-500 transition-colors">{suspect.name}</span>
                                        <MessageSquare className="w-4 h-4 text-neutral-600 group-hover:text-red-500" />
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{suspect.bio}</p>
                                </motion.button>
                            ))}
                        </motion.div>
                    </div>
                </div>

                {/* Middle Column: Evidence Board & Lab */}
                <div className="md:col-span-5 space-y-6">
                    {/* My Clues */}
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            Gizli Dosyalarım
                        </h2>
                        <p className="text-xs text-neutral-500 mb-4">Bu ipuçlarını sadece sen görüyorsun. Ortağına anlat!</p>

                        <div className="grid gap-4">
                            {myClues.filter(c => c.visible_to !== 'BOTH').map(clue => (
                                <div key={clue.id} className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-red-400">{clue.title}</h3>
                                        {clue.is_locked && <Lock className="w-4 h-4 text-neutral-600" />}
                                        {!clue.is_locked && (
                                            <button
                                                onClick={() => {
                                                    if (!selectedCluesForLab[0]) setSelectedCluesForLab([clue, selectedCluesForLab[1]]);
                                                    else if (!selectedCluesForLab[1]) setSelectedCluesForLab([selectedCluesForLab[0], clue]);
                                                    else alert("Laboratuvar dolu. Önce birini çıkarın.");
                                                }}
                                                className="ml-auto text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-neutral-400"
                                            >
                                                + Lab
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm text-neutral-300">
                                        {clue.is_locked && clue.locked_with_code ? (
                                            <div className="space-y-2">
                                                <span className="opacity-50 blur-sm select-none">{clue.description}</span>
                                                <button
                                                    onClick={() => {
                                                        setSelectedClueForUnlock(clue);
                                                        setShowKeypadModal(true);
                                                    }}
                                                    className="block w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-bold text-neutral-300 transition-colors"
                                                >
                                                    Şifreyi Gir
                                                </button>
                                            </div>
                                        ) : (
                                            clue.description
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle Column: Shared Board */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Ortak Pano
                        </h2>
                        <p className="text-xs text-neutral-500 mb-4">Her iki dedektifin de bildiği gerçekler.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Suspects Removed from Shared Board */}

                            {/* Shared Clues */}
                            {myClues.filter(c => c.visible_to === 'BOTH').map(clue => (
                                <div key={clue.id} className="bg-neutral-900 p-4 rounded-xl border border-red-900/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-red-400">{clue.title}</h3>
                                        {!clue.is_locked && (
                                            <button
                                                onClick={() => {
                                                    if (!selectedCluesForLab[0]) setSelectedCluesForLab([clue, selectedCluesForLab[1]]);
                                                    else if (!selectedCluesForLab[1]) setSelectedCluesForLab([selectedCluesForLab[0], clue]);
                                                    else alert("Laboratuvar dolu. Önce birini çıkarın.");
                                                }}
                                                className="ml-auto text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-neutral-400"
                                            >
                                                + Lab
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-neutral-300">{clue.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* Evidence Lab */}
                        <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 col-span-full mt-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
                                <FlaskConical className="w-5 h-5" />
                                Kanıt Laboratuvarı
                            </h2>
                            <p className="text-xs text-neutral-500 mb-4">İki ipucunu birleştirerek yeni bulgular elde et.</p>

                            <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-24 border-2 border-dashed border-neutral-700 rounded-xl flex items-center justify-center relative bg-neutral-950/50">
                                        {selectedCluesForLab[0] ? (
                                            <div className="p-2 text-center">
                                                <p className="text-xs font-bold text-white mb-1">{selectedCluesForLab[0].title}</p>
                                                <button
                                                    onClick={() => setSelectedCluesForLab(prev => [null, prev[1]])}
                                                    className="text-[10px] text-red-400 hover:underline"
                                                >
                                                    Kaldır
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-neutral-600">1. Kanıtı Seç</span>
                                        )}
                                    </div>
                                    <Plus className="w-6 h-6 text-neutral-600" />
                                    <div className="flex-1 h-24 border-2 border-dashed border-neutral-700 rounded-xl flex items-center justify-center relative bg-neutral-950/50">
                                        {selectedCluesForLab[1] ? (
                                            <div className="p-2 text-center">
                                                <p className="text-xs font-bold text-white mb-1">{selectedCluesForLab[1].title}</p>
                                                <button
                                                    onClick={() => setSelectedCluesForLab(prev => [prev[0], null])}
                                                    className="text-[10px] text-red-400 hover:underline"
                                                >
                                                    Kaldır
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-neutral-600">2. Kanıtı Seç</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleCombineClues}
                                    disabled={!selectedCluesForLab[0] || !selectedCluesForLab[1]}
                                    className="w-full py-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-200 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ANALİZ ET
                                </button>
                            </div>
                        </div>

                        {/* Discovered Clues (Analysis Results) */}
                        {discoveredClues.length > 0 && (
                            <div className="col-span-full space-y-2">
                                <h3 className="text-sm font-bold text-blue-400">Laboratuvar Sonuçları</h3>
                                {discoveredClues.map(clue => (
                                    <div key={clue.id} className="bg-blue-950/30 p-4 rounded-xl border border-blue-900/50 relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-blue-400">{clue.title}</h3>
                                            <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full">ANALİZ</span>
                                        </div>
                                        <div className="text-sm text-neutral-300">
                                            {clue.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => {
                                    playSound('click');
                                    setShowAccuseModal(true);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-red-900/20 transition-all transform hover:scale-105"
                                onMouseEnter={() => playSound('hover')}
                            >
                                KATİLİ SUÇLA
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Timeline Builder */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Zaman Çizelgesi
                        </h2>
                        <p className="text-xs text-neutral-500 mb-4">Olayları doğru sıraya dizerek alibileri kontrol et.</p>

                        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-3">
                            {timelineEvents.map((event, index) => (
                                <div key={event.id} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center gap-3 group">
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => moveEvent(index, -1)}
                                            disabled={index === 0 || isTimelineVerified}
                                            className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white disabled:opacity-30"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => moveEvent(index, 1)}
                                            disabled={index === timelineEvents.length - 1 || isTimelineVerified}
                                            className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white disabled:opacity-30"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-neutral-300">{event.time}</span>
                                            {isTimelineVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        </div>
                                        <p className="text-sm font-semibold text-white">{event.title}</p>
                                        <p className="text-xs text-neutral-500">{event.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isTimelineVerified ? (
                            <button
                                onClick={checkTimeline}
                                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-colors"
                            >
                                Sıralamayı Kontrol Et
                            </button>
                        ) : (
                            <div className="p-3 bg-green-900/20 border border-green-900/50 rounded-xl text-center">
                                <p className="text-green-400 font-bold text-sm">Zaman Çizelgesi Doğrulandı!</p>
                                <p className="text-xs text-green-300/70 mt-1">Olayların akışı netleşti.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Keypad Modal */}
            <AnimatePresence>
                {showKeypadModal && selectedClueForUnlock && (
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
                                <p className="text-neutral-500 text-sm mt-1">{selectedClueForUnlock.title}</p>
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
                                        if (keypadInput === selectedClueForUnlock.locked_with_code) {
                                            // Unlock logic
                                            const updatedClues = myClues.map(c =>
                                                c.id === selectedClueForUnlock.id
                                                    ? { ...c, is_locked: false, description: 'ŞİFRE ÇÖZÜLDÜ: Mesajlarda "Borcu bu gece ödeyeceğim, merak etme" yazıyor.' }
                                                    : c
                                            );
                                            setMyClues(updatedClues);
                                            setShowKeypadModal(false);
                                            setKeypadInput('');
                                            alert('Şifre Doğru! İpucu açıldı.');
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
                                onClick={() => {
                                    setShowKeypadModal(false);
                                    setKeypadInput('');
                                }}
                                className="w-full py-3 text-neutral-500 hover:text-white transition-colors"
                            >
                                Kapat
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Interrogation Modal */}
            <AnimatePresence>
                {showInterrogationModal && selectedSuspectForInterrogation && (
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
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full h-[600px] flex flex-col"
                        >
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-red-500">{selectedSuspectForInterrogation.name}</h2>
                                    <p className="text-xs text-neutral-500">Dosya No: #{selectedSuspectForInterrogation.id.toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => setShowInterrogationModal(false)}
                                    className="text-neutral-400 hover:text-white"
                                >
                                    X
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-4 border-b border-neutral-800">
                                {['Profil', 'İlişkiler', 'Sorgu'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === tab
                                            ? 'text-red-500 border-b-2 border-red-500'
                                            : 'text-neutral-500 hover:text-neutral-300'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {activeTab === 'Profil' && (
                                    <div className="space-y-4">
                                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                            <h3 className="text-sm font-bold text-neutral-400 mb-2">Özet</h3>
                                            <p className="text-neutral-200">{selectedSuspectForInterrogation.bio}</p>
                                        </div>
                                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                            <h3 className="text-sm font-bold text-neutral-400 mb-2">Detaylı Biyografi</h3>
                                            <p className="text-neutral-300 text-sm leading-relaxed">{selectedSuspectForInterrogation.detailed_bio}</p>
                                        </div>
                                        <div className="bg-red-900/20 p-4 rounded-xl border border-red-900/30">
                                            <h3 className="text-sm font-bold text-red-400 mb-2">Olası Motivasyon</h3>
                                            <p className="text-red-200 text-sm italic">{selectedSuspectForInterrogation.motive || 'Bilinmiyor.'}</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'İlişkiler' && (
                                    <div className="space-y-3">
                                        {selectedSuspectForInterrogation.relationships?.map((rel: any, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                                                <div className="bg-neutral-800 p-2 rounded-lg">
                                                    <span className="text-xs font-bold text-neutral-400">Hedef</span>
                                                    <div className="font-bold">{CASE_1.suspects.find(s => s.id === rel.target_id)?.name || rel.target_id}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-red-400">{rel.type}</div>
                                                    <p className="text-xs text-neutral-400">{rel.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!selectedSuspectForInterrogation.relationships || selectedSuspectForInterrogation.relationships.length === 0) && (
                                            <p className="text-neutral-500 text-center mt-10">Bilinen bir ilişkisi yok.</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'Sorgu' && (
                                    <>
                                        <div className="h-[300px] overflow-y-auto space-y-4 mb-4 p-2 bg-neutral-950/50 rounded-xl border border-neutral-800">
                                            {interrogationLog.map((log, index) => (
                                                <div key={index} className="space-y-2">
                                                    <div className="flex justify-end">
                                                        <div className="bg-red-900/40 text-red-100 px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] text-sm">
                                                            {log.question}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-start">
                                                        <div className="bg-neutral-800 text-neutral-300 px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                                                            {log.response}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {interrogationLog.length === 0 && (
                                                <div className="text-center text-neutral-600 mt-10 text-sm">
                                                    <p>Sorguya başlamak için bir soru seçin.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-neutral-800">
                                            <p className="text-xs font-bold text-neutral-500 uppercase">Sorular</p>
                                            <div className="grid gap-2">
                                                {selectedSuspectForInterrogation.dialogues.map((q: Question) => (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => {
                                                            setInterrogationLog([...interrogationLog, { question: q.text, response: q.response }]);
                                                        }}
                                                        className="text-left text-xs p-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                                                    >
                                                        {q.text}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Accusation Modal */}
            <AnimatePresence>
                {showAccuseModal && (
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
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full space-y-6"
                        >
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-red-600">KATİL KİM?</h2>
                                <p className="text-neutral-400 mt-2">Yanlış kişiyi suçlarsan katil kaçacak!</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                {shuffledSuspects.map((s: any) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSuspect(s.id)}
                                        className={`p-4 rounded-xl border text-left transition-all relative ${selectedSuspect === s.id
                                            ? 'bg-red-600 border-red-500 text-white'
                                            : 'bg-neutral-800 border-neutral-700 hover:border-neutral-500'
                                            }`}
                                    >
                                        <span className="font-bold block">{s.name}</span>
                                        {/* Partner's Vote Indicator */}
                                        {Object.entries(myVotes).find(([uid, vote]) => vote === s.id && uid !== localStorage.getItem('katil_kim_name')) && (
                                            <span className="absolute -top-2 -right-2 bg-blue-600 text-[10px] px-2 py-1 rounded-full border border-blue-400 shadow-lg z-10">
                                                ORTAĞININ SEÇİMİ
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Feedback Message */}
                            {
                                myVotes && Object.keys(myVotes).length > 0 && (
                                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-center">
                                        {(() => {
                                            const partnerRole = role === 'DETECTIVE_A' ? 'DETECTIVE_B' : 'DETECTIVE_A';
                                            const myVoteId = myVotes?.[role as string];
                                            const partnerVoteId = myVotes?.[partnerRole];

                                            if (myVoteId && partnerVoteId && myVoteId !== partnerVoteId) {
                                                const mySuspect = CASE_1.suspects.find(s => s.id === myVoteId)?.name;
                                                const partnerSuspect = CASE_1.suspects.find(s => s.id === partnerVoteId)?.name;
                                                return (
                                                    <div className="space-y-1">
                                                        <p className="text-red-400 font-bold">ANLAŞMAZLIK!</p>
                                                        <p className="text-sm text-neutral-400">
                                                            Sen <span className="text-white font-bold">{mySuspect}</span> dedin,
                                                            ortağın <span className="text-blue-400 font-bold">{partnerSuspect}</span> dedi.
                                                        </p>
                                                        <p className="text-xs text-neutral-500 mt-2">Aynı kişiyi seçmeden oyun bitmez!</p>
                                                    </div>
                                                );
                                            } else if (partnerVoteId && !myVoteId) {
                                                return (
                                                    <p className="text-sm text-blue-400">
                                                        Ortağın oyunu kullandı. Şimdi sıra sende!
                                                    </p>
                                                );
                                            } else if (myVoteId && !partnerVoteId) {
                                                return (
                                                    <p className="text-sm text-neutral-400">
                                                        Oyun kullanıldı. Ortağını bekle...
                                                    </p>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )
                            }

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowAccuseModal(false);
                                        setSelectedSuspect(null);
                                    }}
                                    className="flex-1 py-3 font-semibold bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleAccusation}
                                    disabled={!selectedSuspect}
                                    className="flex-1 py-3 font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                                >
                                    {myVotes && Object.keys(myVotes).length > 0 ? 'Oyu Değiştir / Onayla' : 'Suçla'}
                                </button>
                            </div>
                        </motion.div >
                    </motion.div >
                )
                }
            </AnimatePresence >

            {/* Game Over / Win Modal */}
            <AnimatePresence>
                {
                    gameState !== 'PLAYING' && (
                        <motion.div
                            variants={fadeIn}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50"
                        >
                            <motion.div
                                variants={scaleUp}
                                initial="hidden"
                                animate="visible"
                                className="text-center space-y-6 max-w-2xl"
                            >
                                {gameState === 'WON' ? (
                                    <>
                                        <h1 className="text-6xl font-black text-green-500 tracking-tighter mb-4">TEBRİKLER!</h1>
                                        <p className="text-2xl text-neutral-300">Katili başarıyla yakaladınız.</p>
                                        <div className="p-6 bg-neutral-900 rounded-2xl border border-green-900/30">
                                            <p className="text-lg">Katil <span className="font-bold text-green-400">{gameCase.solution.killer_name}</span> idi.</p>
                                            <p className="text-neutral-400 mt-2">{gameCase.solution.motive}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-6xl font-black text-red-600 tracking-tighter mb-4">OYUN BİTTİ</h1>
                                        <p className="text-2xl text-neutral-300">Yanlış kişiyi suçladınız. Katil kaçtı!</p>
                                        <div className="p-6 bg-neutral-900 rounded-2xl border border-red-900/30">
                                            <p className="text-lg">Gerçek katil <span className="font-bold text-red-500">{gameCase.solution.killer_name}</span> idi.</p>
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="mt-8 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors"
                                >
                                    Ana Menüye Dön
                                </button>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </motion.main >
    );
}
