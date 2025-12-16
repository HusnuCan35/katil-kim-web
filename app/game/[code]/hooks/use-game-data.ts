import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CASE_1 } from '@/lib/game-content';
import { GameState, Player, Suspect, Clue, TimelineEvent, Case, Role, GamePhase, Room } from '@/types';
import { useSound } from '@/hooks/use-sound';

export function useGameData(code: string) {
    // Game Data State
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameCase, setGameCase] = useState<Case>(CASE_1);
    const [gameState, setGameState] = useState<GamePhase>('LOBBY');
    const [shuffledSuspects, setShuffledSuspects] = useState<Suspect[]>([]);
    const [roomOutcome, setRoomOutcome] = useState<'WON' | 'LOST' | null>(null);

    // Player State
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerRole, setPlayerRole] = useState<Role | null>(null);
    const [playerName, setPlayerName] = useState<string>('');
    const [myClues, setMyClues] = useState<Clue[]>([]);
    const [sharedClues, setSharedClues] = useState<Clue[]>([]);
    const [myVotes, setMyVotes] = useState<Record<string, string>>({});

    // Gameplay State
    const [timeLeft, setTimeLeft] = useState<number>(3600);
    const [loading, setLoading] = useState(true);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

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

            if (roomData.votes) setMyVotes(roomData.votes);

            // Fetch Players (with Avatars)
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

            // Fetch Avatars
            if (playersData) {
                const userIds = playersData.map(p => p.user_id).filter(Boolean);
                let profilesMap: Record<string, string> = {};

                if (userIds.length > 0) {
                    // @ts-ignore
                    const { data: profilesData } = await supabase
                        .from('profiles') // @ts-ignore
                        .select('id, avatar_url')
                        .in('id', userIds);

                    if (profilesData) {
                        profilesData.forEach((prof: any) => {
                            if (prof.avatar_url) profilesMap[prof.id] = prof.avatar_url;
                        });
                    }
                }

                const playersWithAvatars = playersData.map(p => ({
                    ...p,
                    avatar_url: p.user_id ? profilesMap[p.user_id] : undefined
                }));

                setPlayers(playersWithAvatars);
            }

            // Set Game State from Room Data
            if (roomData) {
                let currentCase = CASE_1;
                if (roomData.custom_case) {
                    currentCase = roomData.custom_case;
                    setGameCase(roomData.custom_case);
                }
                setRoom(roomData);

                const suspects = [...currentCase.suspects];
                // Shuffle locally for view
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

            // Player Subscription
            playersChannel = supabase
                .channel(`players_${roomData.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomData.id}` },
                    async (payload) => {
                        // Refresh players list
                        const { data: updatedPlayers } = await supabase
                            .from('players')
                            .select('*')
                            .eq('room_id', roomData.id);

                        if (updatedPlayers && isMounted) {
                            // Re-fetch avatars logic could be duplicated here or extracted. 
                            // For simplicity we will assume avatar refresh on critical updates only OR 
                            // just refresh simple list. Avatar URL unlikely to change mid-game.
                            // But let's copy the logic or refactor fetchPlayers.
                            // For now, simple list update.
                            setPlayers(updatedPlayers);

                            if (payload.eventType === 'DELETE' && payload.old.id !== storedId) {
                                alert("Bir oyuncu oyundan ayrıldı!");
                            }
                        }
                    }
                )
                .subscribe();

            // Room Subscription
            roomChannel = supabase
                .channel(`room_${code}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
                    const newRoom = payload.new as Room;
                    if (isMounted) {
                        if (newRoom.votes) setMyVotes(newRoom.votes);
                        if (newRoom.outcome) {
                            setGameState('FINISHED');
                            setRoomOutcome(newRoom.outcome);
                        }
                    }
                })
                .subscribe();
        };

        if (code) {
            initGame();
        }

        countdownTimer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        pollingTimer = setInterval(async () => {
            if (!code || !isMounted) return;
            const { data: polledRoom } = await supabase
                .from('rooms') // @ts-ignore
                .select('*')
                .eq('code', code)
                .single();

            if (polledRoom && isMounted) {
                if (polledRoom.votes) setMyVotes(polledRoom.votes);
                if (polledRoom.outcome) {
                    setGameState('FINISHED');
                    setRoomOutcome(polledRoom.outcome as 'WON' | 'LOST');
                }
                // Optional: Poll players too
            }
        }, 15000);

        return () => {
            isMounted = false;
            if (countdownTimer) clearInterval(countdownTimer);
            if (pollingTimer) clearInterval(pollingTimer);
            if (playersChannel) supabase.removeChannel(playersChannel);
            if (roomChannel) supabase.removeChannel(roomChannel);
        };
    }, [code]);

    return {
        room,
        players,
        gameCase,
        gameState,
        shuffledSuspects,
        roomOutcome,
        setRoomOutcome,
        playerId,
        playerRole,
        playerName,
        myClues,
        setMyClues,
        sharedClues,
        myVotes,
        setMyVotes, // To update via setstate locally before push
        timeLeft,
        loading,
        timelineEvents,
        setTimelineEvents
    };
}
