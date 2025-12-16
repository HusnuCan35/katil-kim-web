'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Player, Room } from '@/types';

export default function LobbyPage() {
    const { code } = useParams();
    const router = useRouter();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    const fetchPlayers = async (roomId: string) => {
        const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId);

        if (playersError) {
            console.error('Error fetching players:', playersError);
            return;
        }

        if (playersData) {
            // Fetch avatars
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
    };

    useEffect(() => {
        const role = localStorage.getItem('katil_kim_role');
        setCurrentUserRole(role);

        if (!code) return;

        const fetchRoomData = async () => {
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
            await fetchPlayers(roomData.id);
            setLoading(false);
        };

        fetchRoomData();
    }, [code]);

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
                () => {
                    // Refetch all players to get latest avatars and list
                    fetchPlayers(room.id);
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
            <div className="flex h-screen items-center justify-center bg-pattern text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-[#333] rounded-full animate-spin border-t-[#dc2828]"></div>
                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#dc2828] text-2xl">fingerprint</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Lobi yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-pattern p-4 text-white relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#dc2828]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-[#d4af37]/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* Room Code Section */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-[#dc2828]/10 border border-[#dc2828]/30 px-4 py-1.5 rounded-full text-sm text-[#ff4d4d]">
                        <span className="material-symbols-outlined text-base animate-pulse">meeting_room</span>
                        <span>Bekleme Odası</span>
                    </div>

                    <h2 className="text-gray-500 uppercase tracking-widest text-xs font-bold">Oda Kodu</h2>
                    <button
                        onClick={copyCode}
                        className="flex items-center justify-center gap-3 text-6xl font-[family-name:var(--font-playfair)] font-bold tracking-tighter text-gradient hover:scale-105 transition-transform mx-auto group"
                    >
                        {code}
                        <span className="material-symbols-outlined text-3xl text-gray-500 group-hover:text-green-500 transition-colors">
                            {copied ? 'check_circle' : 'content_copy'}
                        </span>
                    </button>
                    <p className="text-gray-500 text-xs">Kodu kopyalamak için tıklayın</p>
                </div>

                {/* Players Section */}
                <div className="glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-4 bg-[#dc2828] rounded-full"></span>
                            <span className="font-[family-name:var(--font-playfair)] font-bold text-white">Dedektifler</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">{players.length}/4</span>
                            {players.length < 4 && (
                                <span className="flex items-center gap-1 text-[10px] text-[#d4af37] animate-pulse">
                                    <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                                    Bekleniyor
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {players.map((player, index) => (
                            <div
                                key={player.id}
                                className={`flex items-center gap-4 p-4 rounded-xl bg-[#1a1a1a] border ${player.role === currentUserRole ? 'border-[#dc2828]/50 shadow-[0_0_15px_rgba(220,40,40,0.2)]' : 'border-[#333]'} transition-all`}
                            >
                                <div className={`relative w-12 h-16 rounded-lg overflow-hidden border ${player.role === currentUserRole ? 'border-[#dc2828]' : 'border-[#333]'} bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center transform ${index % 2 === 0 ? 'rotate-[-2deg]' : 'rotate-[2deg]'}`}>
                                    {player.avatar_url ? (
                                        <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl text-[#dc2828]/40">person</span>
                                    )}
                                    {player.role === currentUserRole && (
                                        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#dc2828] rounded-full animate-ping"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white">{player.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] uppercase tracking-widest text-[#d4af37]/80 font-bold">
                                            {player.role === 'DETECTIVE_A' ? 'Baş Dedektif' : 'Yardımcı Dedektif'}
                                        </span>
                                    </div>
                                </div>
                                {player.role === currentUserRole && (
                                    <span className="text-[10px] bg-[#dc2828]/20 text-[#dc2828] px-2 py-1 rounded-full font-bold border border-[#dc2828]/30">SEN</span>
                                )}
                            </div>
                        ))}

                        {players.length === 1 && (
                            <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-[#333] opacity-50">
                                <div className="w-12 h-16 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-[#333] rounded-full animate-spin border-t-[#dc2828]"></div>
                                </div>
                                <p className="text-gray-500">Oyuncu bekleniyor...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                {currentUserRole === 'DETECTIVE_A' && (
                    <button
                        onClick={startGame}
                        disabled={players.length < 1}
                        className="w-full bg-gradient-to-r from-[#8b0000] to-[#dc2828] hover:from-[#a00] hover:to-[#e63333] disabled:from-[#333] disabled:to-[#333] disabled:text-gray-500 text-white font-bold py-4 rounded-xl shadow-neon transition-all flex items-center justify-center gap-3 group relative overflow-hidden disabled:shadow-none"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">play_arrow</span>
                        <span className="tracking-wide">Oyunu Başlat</span>
                    </button>
                )}

                {currentUserRole === 'DETECTIVE_B' && (
                    <div className="glass-card rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-[#d4af37]">
                            <span className="material-symbols-outlined animate-pulse">hourglass_top</span>
                            <span className="text-sm font-medium">Oyunun başlatılması bekleniyor...</span>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
