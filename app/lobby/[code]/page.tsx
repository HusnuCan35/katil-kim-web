'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Player, Room } from '@/types/game';
import { Loader2, User, Play, Copy, Check } from 'lucide-react';

export default function LobbyPage() {
    const { code } = useParams();
    const router = useRouter();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('katil_kim_role');
        setCurrentUserRole(role);

        if (!code) return;

        const fetchRoomData = async () => {
            // Get room
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', code)
                .single();

            if (roomError) {
                console.error('Error fetching room:', roomError);
                return;
            }
            setRoom(roomData);

            // Get players
            const { data: playersData, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', roomData.id);

            if (playersError) {
                console.error('Error fetching players:', playersError);
                return;
            }
            setPlayers(playersData || []);
            setLoading(false);
        };

        fetchRoomData();

        // Realtime subscription
        const channel = supabase
            .channel('lobby')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                    filter: `room_id=eq.${room?.id || ''}`, // Note: This might need a better way to handle initial room.id being null
                },
                (payload) => {
                    console.log('Change received!', payload);
                    // Refresh players list simply by re-fetching or appending. 
                    // For simplicity, let's re-fetch to ensure consistency or handle insert/delete manually.
                    // Since we can't easily access room.id inside this closure if it wasn't set initially, 
                    // we might want to rely on the payload's room_id if we filtered correctly, 
                    // BUT the filter needs the ID upfront. 
                    // A better pattern is to subscribe AFTER we have the room ID.
                }
            )
            .subscribe();

        // Let's do a simpler polling or separate subscription effect once room is loaded
        return () => {
            supabase.removeChannel(channel);
        };
    }, [code]);

    // Separate effect for subscription once room ID is known
    useEffect(() => {
        if (!room?.id) return;

        const channel = supabase
            .channel(`room:${room.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                    filter: `room_id=eq.${room.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setPlayers((prev) => [...prev, payload.new as Player]);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${room.id}`,
                },
                (payload) => {
                    if (payload.new.status === 'INVESTIGATION') {
                        router.push(`/game/${code}`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room?.id, code, router]);

    const copyCode = () => {
        navigator.clipboard.writeText(code as string);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const startGame = async () => {
        if (!room) return;

        const { error } = await supabase
            .from('rooms')
            .update({
                status: 'INVESTIGATION',
                started_at: new Date().toISOString()
            })
            .eq('id', room.id);

        if (error) {
            console.error('Error starting game:', error);
            alert('Oyun başlatılamadı.');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-100">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-100">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-neutral-400 uppercase tracking-widest text-sm">Oda Kodu</h2>
                    <button
                        onClick={copyCode}
                        className="flex items-center justify-center gap-3 text-6xl font-black tracking-tighter text-white hover:text-red-500 transition-colors mx-auto"
                    >
                        {code}
                        {copied ? <Check className="h-8 w-8 text-green-500" /> : <Copy className="h-8 w-8 opacity-50" />}
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-neutral-500 uppercase tracking-wider px-2">
                        <span>Oyuncular ({players.length}/2)</span>
                        {players.length < 2 && <span className="animate-pulse text-red-500">Bekleniyor...</span>}
                    </div>

                    <div className="grid gap-3">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800"
                            >
                                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <User className="text-neutral-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold">{player.name}</p>
                                    <p className="text-xs text-neutral-500">{player.role === 'DETECTIVE_A' ? 'Baş Dedektif' : 'Yardımcı Dedektif'}</p>
                                </div>
                                {player.role === currentUserRole && (
                                    <span className="text-xs bg-red-900/30 text-red-500 px-2 py-1 rounded">Sen</span>
                                )}
                            </div>
                        ))}

                        {players.length === 1 && (
                            <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-neutral-800 opacity-50">
                                <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-neutral-600" />
                                </div>
                                <p className="text-neutral-500">Oyuncu bekleniyor...</p>
                            </div>
                        )}
                    </div>
                </div>

                {currentUserRole === 'DETECTIVE_A' && (
                    <button
                        onClick={startGame}
                        disabled={players.length < 2}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Play className="fill-current" />
                        Oyunu Başlat
                    </button>
                )}

                {currentUserRole === 'DETECTIVE_B' && (
                    <div className="text-center p-4 text-neutral-500 animate-pulse">
                        Oyunun başlatılması bekleniyor...
                    </div>
                )}
            </div>
        </main>
    );
}
