'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CASE_1 } from '@/lib/game-content';
import { GameState, Player, Suspect, Clue, TimelineEvent, EvidenceCombination, Case, Message, Role, GamePhase, Room, Question } from '@/types/game';
import { ArrowLeft, Clock, Map, Users, AlertTriangle, CheckCircle2, ChevronRight, Lock, Search, Unlock, Play, Pause, RotateCcw, Volume2, VolumeX, MessageSquare, Send, X, LogOut, Loader2, ChevronDown, ChevronUp, FlaskConical, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleUp, slideUp, containerStagger, listItem } from '@/lib/animations';
import { useSound } from '@/hooks/use-sound';
import { validateMessage } from '@/lib/chat-filter';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function GamePage() {
    const params = useParams();
    const code = params?.code as string;
    const router = useRouter();
    const { playSound } = useSound();

    // Game Data State
    const [room, setRoom] = useState<any>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameCase, setGameCase] = useState<Case>(CASE_1);
    const [gameState, setGameState] = useState<GamePhase>('LOBBY');
    const [shuffledSuspects, setShuffledSuspects] = useState<Suspect[]>([]);

    // Player State
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerRole, setPlayerRole] = useState<Role | null>(null);
    const [playerName, setPlayerName] = useState<string>('');
    const [myClues, setMyClues] = useState<Clue[]>([]);
    const [sharedClues, setSharedClues] = useState<Clue[]>([]);

    // Gameplay State
    const [timeLeft, setTimeLeft] = useState<number>(3600); // 1 hour
    const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showIntro, setShowIntro] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState<'Profile' | 'Relationships' | 'Interrogation' | 'Chat' | 'Notes'>('Profile');
    const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null);
    const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
    const [showAccusationModal, setShowAccusationModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);

    // Chat & Notes State
    const [showChatModal, setShowChatModal] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [notes, setNotes] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [chatTab, setChatTab] = useState<'Chat' | 'Notes'>('Chat');
    const lastMessageRef = useRef<{ content: string; timestamp: number } | undefined>(undefined);
    const [chatTimeout, setChatTimeout] = useState<number | null>(null); // Timestamp when timeout ends
    const messageHistoryRef = useRef<number[]>([]); // Timestamps of recent messages

    // Action Modals State
    const [interrogationLog, setInterrogationLog] = useState<{ question: string, response: string }[]>([]);
    const [showInterrogationModal, setShowInterrogationModal] = useState(false);
    const [selectedSuspectForInterrogation, setSelectedSuspectForInterrogation] = useState<Suspect | null>(null);

    const [showKeypadModal, setShowKeypadModal] = useState(false);
    const [keypadInput, setKeypadInput] = useState('');
    const [selectedClueForUnlock, setSelectedClueForUnlock] = useState<Clue | null>(null);

    // Votes & Timeline & Lab
    const [myVotes, setMyVotes] = useState<Record<string, string>>({});
    const [roomOutcome, setRoomOutcome] = useState<'WON' | 'LOST' | null>(null);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [isTimelineVerified, setIsTimelineVerified] = useState(false);
    const [selectedCluesForLab, setSelectedCluesForLab] = useState<(Clue | null)[]>([null, null]);
    const [discoveredClues, setDiscoveredClues] = useState<Clue[]>([]);


    const handleSendMessage = async () => {
        // 1. Check Timeout
        if (chatTimeout && Date.now() < chatTimeout) {
            const remaining = Math.ceil((chatTimeout - Date.now()) / 1000);
            alert(`Çok hızlı mesaj gönderdiğiniz için ${remaining} saniye susturuldunuz.`);
            return;
        } else if (chatTimeout && Date.now() >= chatTimeout) {
            setChatTimeout(null);
        }

        if (!messageInput.trim() || !playerId || !room) {
            console.warn("SendMessage blocked: Missing inputs", { messageInput, playerId, room });
            return;
        }

        const content = messageInput.trim();

        // 2. Chat Content Filter
        const validation = validateMessage(content, lastMessageRef.current);
        if (!validation.isValid) {
            alert(validation.error);
            playSound('error');
            return;
        }

        // 3. Spam Rate Limit Check (5 messages in 5 seconds)
        const now = Date.now();
        const recentMessages = messageHistoryRef.current.filter(t => now - t < 5000);
        if (recentMessages.length >= 5) {
            const timeoutDuration = 30000; // 30 seconds
            setChatTimeout(now + timeoutDuration);
            alert("Çok hızlı mesaj gönderiyorsunuz! 30 saniye boyunca mesaj gönderemezsiniz.");
            messageHistoryRef.current = []; // Reset history
            return;
        }
        messageHistoryRef.current = [...recentMessages, now];

        setMessageInput('');

        try {
            const { error } = await supabase.from('messages').insert({
                room_id: room.id,
                player_id: playerId,
                player_name: playerName,
                content: content
            });

            if (error) {
                console.error("Supabase Error sending message:", error);
                alert("Mesaj gönderilemedi: " + error.message);
                // Restore input on error
                setMessageInput(content);
            } else {
                // Success - update spam context
                lastMessageRef.current = { content, timestamp: Date.now() };
            }
        } catch (err) {
            console.error('Unexpected error sending message:', err);
            alert("Beklenmedik bir hata oluştu.");
            setMessageInput(content);
        }
    };

    // Chat Realtime Subscription
    useEffect(() => {
        if (!room?.id) return;

        // Load existing messages
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', room.id)
                .order('created_at', { ascending: true });

            if (data) {
                const validMessages = data.filter((msg: Message) => validateMessage(msg.content).isValid);
                setMessages(validMessages);
            }
        };
        fetchMessages();

        const channel = supabase
            .channel('chat_room_' + room.id)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `room_id=eq.${room.id}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;

                    // Receive-Side Filter (Double Check)
                    if (!newMsg.is_system) {
                        const validation = validateMessage(newMsg.content);
                        if (!validation.isValid) return; // Ignore bad messages silently
                    }

                    setMessages((prev) => [...prev, newMsg]);
                    if (!showChatModal) {
                        setUnreadMessages((prev) => prev + 1);
                        playSound('success'); // gentle notification sound
                    }
                    // Scroll to bottom
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            )
            .subscribe();

        // Players Channel - Listen for Leave
        const playersChannel = supabase.channel(`public:players:${room.id}`)
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
                async (payload) => {
                    // Start System Message for Leave
                    // Payload for DELETE contains 'old' record (if REPLICA IDENTITY FULL) or just ID.
                    // Ideally we need the name. If ID only, we can't show name unless we have it cached.
                    // For now, let's try to see if 'old' has data. 
                    // NOTE: Default Postgres setup often sends only PK on delete.
                    // We'll rely on our local players list for name lookup if needed, OR checking 'old'.

                    const leftPlayerId = payload.old.id;
                    const leftPlayer = players.find(p => p.id === leftPlayerId);
                    const name = leftPlayer?.name || "Bir dedektif";

                    // Insert System Message
                    await supabase.from('messages').insert({
                        room_id: room.id,
                        player_name: 'Sistem',
                        content: `${name} oyundan ayrıldı.`,
                        is_system: true
                    });

                    // Update local list (already handled by fetching? or need explicit remove?)
                    // We probably have a separate subscription for players list updates somewhere?
                    // Actually, page.tsx doesn't seem to have a realtime subscription for PLAYERS LIST update yet?
                    // It fetches once. We should update the players list too.
                    setPlayers(prev => prev.filter(p => p.id !== leftPlayerId));
                }
            )
            .subscribe();


        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(playersChannel);
        };
    }, [room?.id, showChatModal, playSound, players, code]);

    // Auto-scroll when messages change or modal opens
    useEffect(() => {
        if (showChatModal && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showChatModal]);

    // Notes LocalStorage
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

    useEffect(() => {
        let isMounted = true;
        const storedRole = localStorage.getItem('katil_kim_role') as Role;
        const storedId = localStorage.getItem('katil_kim_id');
        const storedName = localStorage.getItem('katil_kim_name');

        setPlayerRole(storedRole);
        setPlayerId(storedId);
        if (storedName) setPlayerName(storedName);

        let playersChannel: any = null;
        let roomChannel: any = null;
        let countdownTimer: NodeJS.Timeout;
        let pollingTimer: NodeJS.Timeout;

        const initGame = async () => {
            if (!isMounted) return;

            // Fetch Room Data
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', code)
                .single();


            if (roomError || !roomData) {
                alert("Oda bulunamadı.");
                window.location.href = '/';
                return;
            }

            if (roomData.status === 'FINISHED') {
                alert("Bu oyun sona erdi.");
                window.location.href = '/';
                return;
            }

            // Fetch Players
            const { data: playersData } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', roomData.id);

            if (!isMounted) return;

            // Strict Access Control
            const amIInList = playersData?.find(p => p.id === storedId);
            if (!amIInList) {
                localStorage.removeItem('katil_kim_role');
                localStorage.removeItem('katil_kim_name');
                localStorage.removeItem('katil_kim_id');
                window.location.href = '/';
                return;
            }

            if (playersData) setPlayers(playersData);

            // Set Game State from Room Data
            if (roomData) {
                let currentCase = CASE_1;
                if (roomData.custom_case) {
                    currentCase = roomData.custom_case;
                    setGameCase(roomData.custom_case);
                }
                setRoom(roomData);

                const suspects = [...currentCase.suspects];
                // Deterministic shuffle based on room id seed? or just random is fine for local view sync isn't super critical for suspect order visually 
                // BUT for "same suspect" voting, ID is what matters. 
                // Visual order sync would require saving shuffle seed. For now, keep local random.
                for (let i = suspects.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [suspects[i], suspects[j]] = [suspects[j], suspects[i]];
                }
                setShuffledSuspects(suspects);

                if (storedRole) {
                    const my = currentCase.clues.filter((c: Clue) => c.visible_to === storedRole);
                    const shared = currentCase.clues.filter((c: Clue) => c.visible_to === 'BOTH');
                    setMyClues(my);
                    setSharedClues(shared);
                }

                const events = [...currentCase.timeline_events];
                for (let i = events.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [events[i], events[j]] = [events[j], events[i]];
                }
                setTimelineEvents(events);

                if (roomData.started_at) {
                    const startTime = new Date(roomData.started_at).getTime();
                    const now = new Date().getTime();
                    const elapsedSeconds = Math.floor((now - startTime) / 1000);
                    const remaining = Math.max(0, (30 * 60) - elapsedSeconds);
                    setTimeLeft(remaining);
                }
            }
            setLoading(false);

            // --- REALTIME SUBSCRIPTIONS ---

            // 1. Players Subscription (Exits/Joins)
            console.log("Subscribing to players for room:", roomData.id);
            playersChannel = supabase
                .channel(`players_${roomData.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomData.id}` },
                    async (payload) => {
                        console.log("Players Change Payload:", payload);
                        // Refresh players list
                        const { data: updatedPlayers } = await supabase
                            .from('players')
                            .select('*')
                            .eq('room_id', roomData.id);

                        if (updatedPlayers && isMounted) {
                            setPlayers(updatedPlayers);
                            if (payload.eventType === 'DELETE' && payload.old.id !== storedId) {
                                alert("Bir oyuncu oyundan ayrıldı!");
                            }
                        }
                    }
                )
                .subscribe((status) => console.log("Players Channel Status:", status));

            // 2. Room Subscription (Votes/Outcome)
            console.log("Subscribing to room updates:", roomData.code);
            roomChannel = supabase
                .channel(`room_${code}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
                    console.log("Room Update Payload:", payload);
                    const newRoom = payload.new as Room;
                    if (isMounted) {
                        if (newRoom.votes) setMyVotes(newRoom.votes);
                        if (newRoom.outcome) {
                            setGameState('FINISHED');
                            setRoomOutcome(newRoom.outcome);
                        }
                    }
                })
                .subscribe((status) => console.log("Room Channel Status:", status));
        };

        if (code) {
            initGame();
        }

        // --- TIMERS ---
        countdownTimer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        // --- POLLING FALLBACK (Every 3 seconds) ---
        pollingTimer = setInterval(async () => {
            if (!code || !isMounted) return;
            // console.log("Polling room state...");
            const { data: polledRoom } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', code)
                .single();

            if (polledRoom && isMounted) {
                if (polledRoom.votes) setMyVotes(polledRoom.votes);
                if (polledRoom.outcome) {
                    setGameState('FINISHED');
                    const outcome = polledRoom.outcome as 'WON' | 'LOST';
                    setRoomOutcome(outcome);

                    // Update DB outcome if I am the host (to avoid duplicate writes, or just let last write win)
                    // Actually easier: The Backend/Server Action usually handles this? No, we are client-side only for now.
                    // We should update the 'rooms' table with the outcome if it's not set.
                    // But wait, who sets newRoom.outcome? It comes from the DB in polling/realtime!
                    // Ah, the voting logic sets it in 'rooms' table via 'votes' update?
                    // Let's check `handleVote`.
                    // `handleVote` does NOT calculate outcome. It currently just updates votes.
                    // WE MISSING THE LOGIC THAT SAYS "EVERYONE VOTED -> CALCULATE RESULT -> UPDATE DB".
                    // Currently `checkConsensus` handles it locally.

                    // We need to verify where `outcome` is written. It seems it wasn't written to DB 'outcome' column before (only local state or JSON?).
                    // Now we added `outcome` column. We must ensure it gets written.
                }

                // Also poll players?
                const { data: polledPlayers } = await supabase.from('players').select('*').eq('room_id', polledRoom.id);
                if (polledPlayers) setPlayers(polledPlayers);
            }
        }, 3000);

        return () => {
            isMounted = false;
            if (countdownTimer) clearInterval(countdownTimer);
            if (pollingTimer) clearInterval(pollingTimer);
            if (playersChannel) supabase.removeChannel(playersChannel);
            if (roomChannel) supabase.removeChannel(roomChannel);
        };
    }, [code]);

    const handleSuspectClick = (suspect: any) => {
        setSelectedSuspectForInterrogation(suspect);
        setInterrogationLog([]);
        setActiveTab('Relationships');
        setShowInterrogationModal(true);
    };

    const handleAccusation = async () => {
        console.log("handleAccusation triggered. Suspect:", selectedSuspect, "Player:", playerId);
        if (!selectedSuspect || !playerId) {
            console.error("Missing suspect or player ID");
            return;
        }

        try {
            // 1. Get current room
            const { data: roomData, error: fetchError } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', code)
                .single();

            if (fetchError || !roomData) {
                console.error("Fetch Room Error:", fetchError);
                alert("Oda verisi alınamadı.");
                return;
            }
            console.log("Current Room Data:", roomData);

            // 2. Get current ACTIVE players
            const { data: activePlayers, error: playersError } = await supabase
                .from('players')
                .select('id')
                .eq('room_id', roomData.id);

            if (playersError || !activePlayers) {
                console.error("Fetch Players Error:", playersError);
                alert("Oyuncu listesi alınamadı.");
                return;
            }
            console.log("Active Players:", activePlayers);

            const activePlayerIds = activePlayers.map(p => p.id);
            console.log("Active Player IDs:", activePlayerIds);

            // 3. Prepare Votes (Clean up ghost votes)
            const currentVotes = roomData.votes || {};
            const validVotes: Record<string, string> = {};

            // Keep only votes from active players
            Object.entries(currentVotes).forEach(([pid, vote]) => {
                if (activePlayerIds.includes(pid)) {
                    validVotes[pid] = vote as string;
                }
            });

            // Add/Update MY vote
            if (selectedSuspect) {
                validVotes[playerId] = selectedSuspect.id;
            }
            console.log("Proposed Valid Votes:", validVotes);

            // 4. Check for Consensus
            // Do we have votes from ALL active players?
            const totalActivePlayers = activePlayerIds.length;
            const totalValidVotes = Object.keys(validVotes).length;
            console.log(`Votes: ${totalValidVotes}/${totalActivePlayers}`);

            let outcome = null;
            let status = roomData.status;

            if (totalValidVotes >= totalActivePlayers) {
                // Everyone has voted. Check if they agree.
                const voteValues = Object.values(validVotes);
                const firstVote = voteValues[0];
                const allAgreed = voteValues.every(v => v === firstVote);
                console.log("All Agreed?", allAgreed);

                if (allAgreed) {
                    status = 'FINISHED';
                    const killerId = gameCase.solution.killer_id;
                    outcome = firstVote === killerId ? 'WON' : 'LOST';
                    console.log("Consensus Reached! Outcome:", outcome);
                } else {
                    console.log("No Consensus yet.");
                }
            } else {
                console.log("Waiting for more votes...");
            }

            // 5. Update Room
            const { error: updateError } = await supabase
                .from('rooms')
                .update({
                    votes: validVotes,
                    outcome: outcome,
                    status: status,
                    finished_at: status === 'FINISHED' ? new Date().toISOString() : null
                })
                .eq('id', roomData.id);

            if (updateError) {
                console.error('Update Room Error', updateError);
                alert("Oylama kaydedilemedi.");
                return;
            }
            console.log("Room updated successfully.");

            setShowAccusationModal(false);

        } catch (err) {
            console.error("Accusation Exception:", err);
            alert("Bir hata oluştu.");
        }
    };

    const handleExit = async () => {
        if (confirm("Oyundan çıkmak istediğine emin misin? Bir daha bu odaya dönemezsin.")) {
            // Remove player from DB
            if (playerId) {
                await supabase.from('players').delete().eq('id', playerId);
            }

            // Allow timer to "continue" for others by NOT touching the room's started_at

            // Clear local storage
            localStorage.removeItem('katil_kim_role');
            localStorage.removeItem('katil_kim_name');
            localStorage.removeItem('katil_kim_id');

            // Redirect
            window.location.href = '/';
        }
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
            {/* Story Intro Modal */}
            <AnimatePresence>
                {showIntro && (
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
                                <h1 className="text-5xl md:text-7xl font-black text-red-600 tracking-tighter">
                                    {gameCase.title}
                                </h1>
                                <div className="h-px bg-gradient-to-r from-transparent via-red-900 to-transparent w-full" />
                            </div>

                            <div className="bg-neutral-900/50 p-8 rounded-3xl border border-neutral-800 backdrop-blur-sm shadow-2xl">
                                <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed font-serif italic">
                                    "{gameCase.intro}"
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => {
                                        playSound('click');
                                        setShowIntro(false);
                                    }}
                                    className="group relative px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)]"
                                    onMouseEnter={() => playSound('hover')}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Vakayı İncele <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                                    </span>
                                </button>
                                <p className="mt-4 text-neutral-500 text-sm animate-pulse">
                                    Dedektif, göreve hazır mısın?
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="flex justify-between items-center mb-8 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 backdrop-blur-sm sticky top-4 z-40 shadow-xl">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExit}
                        className="p-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-red-900/50 hover:border-red-500/50 hover:text-red-200 transition-all group"
                        title="Oyundan Ayrıl"
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
                        <p className="text-sm font-bold text-neutral-200">{playerRole === 'DETECTIVE_A' ? 'Baş Dedektif' : 'Yardımcı'}</p>
                        <p className="text-xs text-neutral-500">Rolün</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Suspects & Interrogation */}
                <div className="md:col-span-4 space-y-6">
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" />
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
                                        setActiveTab('Interrogation');
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
                                    setShowAccusationModal(true);
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
                            {/* Tabs */}
                            <div className="flex gap-2 mb-4 border-b border-neutral-800">
                                {[
                                    { id: 'Profile', label: 'Profil' },
                                    { id: 'Relationships', label: 'İlişkiler' },
                                    { id: 'Interrogation', label: 'Sorgu' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === tab.id
                                            ? 'text-red-500 border-b-2 border-red-500'
                                            : 'text-neutral-500 hover:text-neutral-300'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {activeTab === 'Profile' && (
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

                                {activeTab === 'Relationships' && (
                                    <div className="space-y-3">
                                        {selectedSuspectForInterrogation.relationships?.map((rel: any, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                                                <div className="bg-neutral-800 p-2 rounded-lg">
                                                    <span className="text-xs font-bold text-neutral-400">Hedef</span>
                                                    <div className="font-bold">{gameCase.suspects.find(s => s.id === rel.target_id)?.name || rel.target_id}</div>
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

                                {activeTab === 'Interrogation' && (
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
                {showAccusationModal && (
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
                                {shuffledSuspects.map((s: any) => {
                                    const voteCount = Object.values(myVotes).filter(v => v === s.id).length;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedSuspect(s)}
                                            className={`p-4 rounded-xl border text-left transition-all relative ${selectedSuspect === s.id
                                                ? 'bg-red-600 border-red-500 text-white'
                                                : 'bg-neutral-800 border-neutral-700 hover:border-neutral-500'
                                                }`}
                                        >
                                            <span className="font-bold block">{s.name}</span>
                                            {/* Vote Count Indicator */}
                                            {voteCount > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-blue-600 text-[10px] px-2 py-1 rounded-full border border-blue-400 shadow-lg z-10">
                                                    {voteCount} OY
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Feedback Message */}
                            {
                                players.length > 0 && (
                                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Oylama Durumu</h3>
                                        <div className="space-y-2">
                                            {players.map(p => {
                                                const voteId = myVotes[p.id];
                                                const votedSuspect = voteId ? gameCase.suspects.find((s: any) => s.id === voteId) : null;
                                                const isMe = p.id === localStorage.getItem('katil_kim_id');

                                                return (
                                                    <div key={p.id} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold ${isMe ? 'text-red-500' : 'text-neutral-300'}`}>
                                                                {p.name} {isMe && '(Sen)'}
                                                            </span>
                                                        </div>
                                                        <div className="">
                                                            {votedSuspect ? (
                                                                <span className="text-blue-400 font-bold">{votedSuspect.name}</span>
                                                            ) : (
                                                                <span className="text-neutral-600 italic animate-pulse">Düşünüyor...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-2 text-center border-t border-neutral-800 pt-2">
                                            Tüm dedektifler oy kullandığında oyun biter.
                                        </p>
                                    </div>
                                )
                            }

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowAccusationModal(false);
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



            {/* Chat & Notes Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => {
                        setShowChatModal(true);
                        setUnreadMessages(0);
                    }}
                    className="relative bg-neutral-900 hover:bg-neutral-800 text-white p-4 rounded-full shadow-lg border border-neutral-700 transition-all hover:scale-105"
                >
                    <MessageSquare className="w-6 h-6" />
                    {unreadMessages > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full animate-bounce">
                            {unreadMessages}
                        </span>
                    )}
                </button>
            </div>

            {/* Chat & Notes Modal */}
            <AnimatePresence>
                {showChatModal && (
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            variants={scaleUp}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setChatTab('Chat')}
                                        className={`font-bold transition-colors ${chatTab === 'Chat' ? 'text-red-500' : 'text-neutral-500 hover:text-white'}`}
                                    >
                                        Sohbet
                                    </button>
                                    <button
                                        onClick={() => setChatTab('Notes')}
                                        className={`font-bold transition-colors ${chatTab === 'Notes' ? 'text-red-500' : 'text-neutral-500 hover:text-white'}`}
                                    >
                                        Notlar
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowChatModal(false)}
                                    className="text-neutral-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                {chatTab === 'Chat' ? (
                                    <div className="h-full flex flex-col">
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {messages.length === 0 ? (
                                                <div className="text-center text-neutral-600 mt-10">
                                                    <p className="text-sm">Henüz mesaj yok.</p>
                                                    <p className="text-xs">Diğer dedektiflerle konuşun.</p>
                                                </div>
                                            ) : (
                                                messages.map(msg => {
                                                    const isMe = msg.player_id === playerId;
                                                    return (
                                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'bg-red-900/50 text-white rounded-tr-none' : 'bg-neutral-800 text-neutral-200 rounded-tl-none'}`}>
                                                                <p className="text-xs font-bold mb-1 opacity-50">{msg.player_name}</p>
                                                                <p className="text-sm">{msg.content}</p>
                                                            </div>
                                                            <span className="text-[10px] text-neutral-600 mt-1">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                        <div className="p-4 border-t border-neutral-800 flex gap-2">
                                            <input
                                                type="text"
                                                value={messageInput}
                                                onChange={(e) => setMessageInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder="Mesaj yaz..."
                                                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!messageInput.trim()}
                                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white p-3 rounded-xl transition-colors"
                                            >
                                                <Send className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col p-4">
                                        <p className="text-xs text-neutral-500 mb-2">Bu notlar sadece sizin cihazınızda saklanır. Kimse göremez.</p>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Şüpheli hareketler, ipuçları..."
                                            className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 focus:outline-none focus:border-red-600 transition-colors resize-none mb-2"
                                        />
                                        <div className="flex justify-between items-center text-xs text-neutral-600">
                                            <span>Otomatik Kaydediliyor</span>
                                            {notes.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Notları silmek istediğinize emin misiniz?')) setNotes('');
                                                    }}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    Temizle
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Over / Win Modal */}
            <AnimatePresence>
                {
                    roomOutcome !== null && (
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
                                {roomOutcome === 'WON' ? (
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
                                            <p className="text-neutral-400 mt-2">{gameCase.solution.motive}</p>
                                        </div>
                                    </>
                                )}

                                {/* Voting Summary */}
                                <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-3 text-left">
                                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">Kim Kimi Suçladı?</h3>
                                    <div className="space-y-2">
                                        {players.map(p => {
                                            const voteId = myVotes[p.id];
                                            const votedSuspect = voteId ? gameCase.suspects.find((s: any) => s.id === voteId) : null;
                                            const isKiller = votedSuspect?.id === gameCase.solution.killer_id;

                                            return (
                                                <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-neutral-950/50">
                                                    <span className="font-bold text-neutral-300">{p.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        {votedSuspect ? (
                                                            <>
                                                                <span className={isKiller ? 'text-green-500 font-bold' : 'text-red-400'}>
                                                                    {votedSuspect.name}
                                                                </span>
                                                                {isKiller ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <LogOut className="w-4 h-4 text-red-400 rotate-45" />}
                                                            </>
                                                        ) : (
                                                            <span className="text-neutral-600 italic">Oy Kullanmadı</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

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
