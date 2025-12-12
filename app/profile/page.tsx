'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Trophy, History, Percent, User } from 'lucide-react';
import Link from 'next/link';

interface GameHistory {
    id: string;
    code: string;
    created_at: string;
    role: string;
    room: {
        code: string;
        outcome: 'WON' | 'LOST' | null;
        title?: string;
        duration?: string;
        playerCount?: number;
    } | null;
}

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<GameHistory[]>([]);

    // Stats
    const [totalGames, setTotalGames] = useState(0);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [winRate, setWinRate] = useState(0);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setErrorMsg(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            setProfile(profileData);

            // 2. Fetch Player Records (My Games)
            console.log("Fetching players for user:", session.user.id);
            // Note: DB column is 'joined_at', not 'created_at' in players table (from init.sql)
            const { data: playerRecords, error: fetchError } = await supabase
                .from('players')
                .select('id, joined_at, role, room_id')
                .eq('user_id', session.user.id)
                .order('joined_at', { ascending: false })
                .limit(10);

            if (fetchError) {
                console.error("Supabase Fetch Error:", JSON.stringify(fetchError, null, 2));
                setErrorMsg(`Error: ${fetchError.message || fetchError.code} (Check Console)`);
                setLoading(false);
                return;
            }

            if (playerRecords && playerRecords.length > 0) {
                const roomIds = playerRecords.map((p: any) => p.room_id);

                // 3. Fetch Rooms Details
                const { data: roomsData } = await supabase
                    .from('rooms')
                    .select('id, code, outcome, created_at, finished_at, started_at, custom_case')
                    .in('id', roomIds);

                // 4. Fetch Player Counts for these rooms
                // Using a raw count query or grouping might be cleaner, but for <10 rooms, fetching players is efficient enough.
                const { data: allPlayersInRooms } = await supabase
                    .from('players')
                    .select('room_id')
                    .in('room_id', roomIds);

                const playerCountMap: Record<string, number> = {};
                if (allPlayersInRooms) {
                    allPlayersInRooms.forEach((p: any) => {
                        playerCountMap[p.room_id] = (playerCountMap[p.room_id] || 0) + 1;
                    });
                }

                // Map rooms by ID
                // @ts-ignore
                const roomsMap = (roomsData || []).reduce((acc: any, room: any) => {
                    acc[room.id] = room;
                    return acc;
                }, {});

                // Combine Data
                const fullHistory = playerRecords.map((p: any) => {
                    const room = roomsMap[p.room_id];
                    let title = "Bilinmeyen Vaka";
                    let duration = "-";

                    if (room) {
                        // Title Logic
                        if (room.custom_case && room.custom_case.title) {
                            title = room.custom_case.title;
                        } else {
                            title = "Karanlık Malikane"; // Default Classic Case
                        }

                        // Duration Logic
                        if (room.finished_at && room.started_at) {
                            const start = new Date(room.started_at).getTime();
                            const end = new Date(room.finished_at).getTime();
                            const diffMins = Math.round((end - start) / 60000);
                            duration = `${diffMins} dk`;
                        } else if (room.finished_at && room.created_at) {
                            // Fallback if started_at is missing
                            const start = new Date(room.created_at).getTime();
                            const end = new Date(room.finished_at).getTime();
                            const diffMins = Math.round((end - start) / 60000);
                            duration = `${diffMins} dk`;
                        }
                    }

                    // Role Localization
                    const roleName = p.role === 'DETECTIVE_A' ? 'Baş Dedektif'
                        : p.role === 'DETECTIVE_B' ? 'Yardımcı Dedektif'
                            : p.role;

                    return {
                        id: p.id,
                        code: roomsMap[p.room_id]?.code || '???',
                        created_at: p.joined_at,
                        role: roleName,
                        room: roomsMap[p.room_id] ? {
                            code: roomsMap[p.room_id].code,
                            outcome: roomsMap[p.room_id].outcome,
                            title: title,
                            duration: duration,
                            playerCount: playerCountMap[p.room_id] || 0
                        } : null
                    };
                });

                setHistory(fullHistory);

                // 4. Stats Calc (Same as before)
                const { count: totalCount } = await supabase
                    .from('players')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id);

                setTotalGames(totalCount || 0);

                const { data: allPlayerRecs } = await supabase
                    .from('players')
                    .select('room_id')
                    .eq('user_id', session.user.id);

                if (allPlayerRecs && allPlayerRecs.length > 0) {
                    const allRoomIds = allPlayerRecs.map((p: any) => p.room_id);
                    const { data: allRooms } = await supabase
                        .from('rooms')
                        .select('outcome')
                        .in('id', allRoomIds);

                    if (allRooms) {
                        let w = 0;
                        let l = 0;
                        // @ts-ignore
                        allRooms.forEach((r: any) => {
                            if (r.outcome === 'WON') w++;
                            if (r.outcome === 'LOST') l++;
                        });
                        setWins(w);
                        setLosses(l);
                        setWinRate(w + l > 0 ? Math.round((w / (w + l)) * 100) : 0);
                    }
                }
            } else {
                setHistory([]);
                setTotalGames(0);
                setWins(0);
                setLosses(0);
                setWinRate(0);
            }
            setLoading(false);
        };
        fetchData();
    }, [router]);

    if (loading) return (
        <main className="min-h-screen bg-black flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
    );

    if (errorMsg) return (
        <main className="min-h-screen bg-neutral-950 flex items-center justify-center text-white p-4">
            <div className="bg-red-900/20 border border-red-900 p-6 rounded-2xl max-w-md text-center">
                <h2 className="text-xl font-bold text-red-500 mb-2">Veri Çekme Hatası</h2>
                <p className="text-neutral-300 font-mono text-sm">{errorMsg}</p>
                <Link href="/" className="inline-block mt-4 px-4 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700">
                    Ana Menüye Dön
                </Link>
            </div>
        </main>
    );

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tighter">Profil</h1>
                </div>

                {/* Profile Card */}
                <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl flex items-center gap-6">
                    <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center border-2 border-red-600">
                        <User className="w-10 h-10 text-neutral-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{profile?.username}</h2>
                        <p className="text-neutral-500 text-sm">Katıldığı Tarih: {new Date(profile?.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col items-center text-center">
                        <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
                        <span className="text-3xl font-black text-white">{wins}</span>
                        <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Kazanılan</span>
                    </div>
                    <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col items-center text-center">
                        <History className="w-8 h-8 text-blue-500 mb-2" />
                        <span className="text-3xl font-black text-white">{totalGames}</span>
                        <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Toplam Oyun</span>
                    </div>
                    <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col items-center text-center">
                        <Percent className="w-8 h-8 text-green-500 mb-2" />
                        <span className="text-3xl font-black text-white">%{winRate}</span>
                        <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Kazanma Oranı</span>
                    </div>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-neutral-300">Son Oyunlar</h3>
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-neutral-600 border border-dashed border-neutral-800 rounded-2xl">
                            Henüz oyun geçmişi yok.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((game) => (
                                <div key={game.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${game.room?.outcome === 'WON' ? 'bg-green-500' : game.room?.outcome === 'LOST' ? 'bg-red-500' : 'bg-neutral-600'}`} />
                                            <span className="font-bold text-white text-lg">{game.room?.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-neutral-500 ml-5">
                                            <span className="font-mono bg-neutral-950 px-1.5 py-0.5 rounded">{game.room?.code}</span>
                                            <span>•</span>
                                            <span>{game.room?.playerCount} Kişilik</span>
                                            <span>•</span>
                                            <span>{game.room?.duration}</span>
                                            <span>•</span>
                                            <span>{game.role}</span>
                                        </div>
                                    </div>

                                    <div className="px-4 py-2 rounded-lg bg-neutral-950 font-bold text-sm">
                                        {game.room?.outcome === 'WON' ? <span className="text-green-500">KAZANDI</span> :
                                            game.room?.outcome === 'LOST' ? <span className="text-red-500">KAYBETTİ</span> :
                                                <span className="text-neutral-500">SÜRÜYOR</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
