'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
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
    const [uploading, setUploading] = useState(false);

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

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            setProfile(profileData);

            const { data: playerRecords, error: fetchError } = await supabase
                .from('players')
                .select('id, joined_at, role, room_id')
                .eq('user_id', session.user.id)
                .order('joined_at', { ascending: false })
                .limit(10);

            if (fetchError) {
                setErrorMsg(`Error: ${fetchError.message || fetchError.code}`);
                setLoading(false);
                return;
            }

            if (playerRecords && playerRecords.length > 0) {
                const roomIds = playerRecords.map((p: any) => p.room_id);

                const { data: roomsData } = await supabase
                    .from('rooms')
                    .select('id, code, outcome, created_at, finished_at, started_at, custom_case')
                    .in('id', roomIds);

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

                // @ts-ignore
                const roomsMap = (roomsData || []).reduce((acc: any, room: any) => {
                    acc[room.id] = room;
                    return acc;
                }, {});

                const fullHistory = playerRecords.map((p: any) => {
                    const room = roomsMap[p.room_id];
                    let title = "Bilinmeyen Vaka";
                    let duration = "-";

                    if (room) {
                        if (room.custom_case && room.custom_case.title) {
                            title = room.custom_case.title;
                        } else {
                            title = "Karanlık Malikane";
                        }

                        if (room.finished_at && room.started_at) {
                            const start = new Date(room.started_at).getTime();
                            const end = new Date(room.finished_at).getTime();
                            const diffMins = Math.round((end - start) / 60000);
                            duration = `${diffMins} dk`;
                        } else if (room.finished_at && room.created_at) {
                            const start = new Date(room.created_at).getTime();
                            const end = new Date(room.finished_at).getTime();
                            const diffMins = Math.round((end - start) / 60000);
                            duration = `${diffMins} dk`;
                        }
                    }

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

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Bir resim seçmelisiniz.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (profile) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', profile.id);


                if (updateError) {
                    throw updateError;
                }
                setProfile({ ...profile, avatar_url: publicUrl });
            }

            // alert('Profil fotoğrafı güncellendi!');
        } catch (error: any) {
            alert('Hata: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#dc2828]/10 rounded-full blur-[150px] animate-pulse"></div>
            </div>
            <div className="flex flex-col items-center gap-6 relative z-10">
                <div className="relative">
                    <div className="w-20 h-20 border-r-2 border-b-2 border-[#dc2828] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#dc2828] text-3xl animate-pulse">fingerprint</span>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-white font-bold text-lg tracking-widest uppercase">Kimlik Doğrulanıyor</p>
                    <p className="text-white/30 text-xs tracking-[0.2em]">SİSTEME ERİŞİM BEKLENİYOR...</p>
                </div>
            </div>
        </main>
    );

    if (errorMsg) return (
        <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
            <div className="bg-gradient-to-br from-[#1a1212] to-[#0f0a0a] border border-[#dc2828]/30 p-8 rounded-3xl max-w-md text-center shadow-[0_0_50px_rgba(220,40,40,0.2)] relative z-10">
                <div className="w-20 h-20 bg-[#dc2828]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#dc2828]/20">
                    <span className="material-symbols-outlined text-4xl text-[#dc2828]">gpp_maybe</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-playfair)]">Erişim Reddedildi</h2>
                <p className="text-white/50 text-sm mb-8 font-mono border-t border-b border-white/5 py-4">{errorMsg}</p>
                <Link href="/" className="inline-flex items-center gap-3 px-6 py-3 bg-[#dc2828] hover:bg-[#b91c1c] text-white rounded-xl transition-all font-bold tracking-wide shadow-lg hover:shadow-red-900/40 group">
                    <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    ANA MENÜYE DÖN
                </Link>
            </div>
        </main>
    );

    return (
        <main className="min-h-screen bg-[#070707] text-white p-6 relative overflow-x-hidden font-sans selection:bg-[#dc2828]/30">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#dc2828]/5 rounded-full blur-[150px] opacity-40"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[120px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="max-w-6xl mx-auto space-y-10 relative z-10">
                {/* Header Navigation */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="group flex items-center gap-3 pl-2 pr-4 py-2 rounded-lg hover:bg-white/5 transition-all text-white/60 hover:text-white">
                            <div className="p-2 bg-white/5 rounded-full group-hover:bg-[#dc2828] transition-colors">
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                            </div>
                            <span className="font-bold tracking-wide text-sm">ANA MENÜ</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#dc2828]/10 border border-[#dc2828]/20 rounded-full">
                        <div className="w-2 h-2 bg-[#dc2828] rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-[#dc2828] tracking-wider">ÇEVRİMİÇİ</span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Identity & Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Identity Card */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#dc2828] to-[#d4af37] rounded-3xl opacity-30 blur group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative bg-[#111] border border-white/10 p-6 rounded-2xl overflow-hidden">
                                {/* Card Background Pattern */}
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <span className="material-symbols-outlined text-9xl">fingerprint</span>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-4 group cursor-pointer">
                                        <label htmlFor="avatar-upload" className="cursor-pointer">
                                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#222] to-[#111] p-1 shadow-2xl border border-white/10 group-hover:border-[#d4af37]/50 transition-colors relative overflow-hidden">
                                                <div className="w-full h-full bg-[#151515] rounded-xl flex items-center justify-center relative overflow-hidden">
                                                    {profile?.avatar_url ? (
                                                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-5xl text-white/20">person</span>
                                                    )}
                                                    {/* Scan Line Effect */}
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-[#d4af37]/50 shadow-[0_0_10px_rgba(212,175,55,0.5)] animate-scan"></div>

                                                    {/* Upload Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                        {uploading ? (
                                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="material-symbols-outlined text-white text-2xl">upload</span>
                                                                <span className="text-[10px] uppercase font-bold text-white tracking-widest">Düzenle</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                id="avatar-upload"
                                                accept="image/*"
                                                onChange={uploadAvatar}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                        </label>
                                        <div className="absolute -bottom-3 -right-3 bg-[#111] p-1.5 rounded-full border border-white/10">
                                            <div className="bg-[#d4af37] p-1 rounded-full text-black">
                                                <span className="material-symbols-outlined text-sm font-bold block">verified_user</span>
                                            </div>
                                        </div>
                                    </div>

                                    <h2 className="text-3xl font-bold text-white font-[family-name:var(--font-playfair)] mb-1">{profile?.username}</h2>
                                    <div className="flex items-center gap-2 text-white/40 text-xs font-mono mb-6 bg-white/5 px-3 py-1 rounded-md border border-white/5">
                                        <span className="material-symbols-outlined text-sm">id_card</span>
                                        ID: {profile?.id?.substring(0, 8).toUpperCase()}
                                    </div>

                                    <div className="w-full grid grid-cols-2 gap-3 text-left">
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Rütbe</p>
                                            <p className="text-[#d4af37] font-bold text-sm flex items-center gap-1">
                                                <span className="material-symbols-outlined text-base">local_police</span>
                                                {totalGames > 10 ? 'Başkomiser' : 'Çaylak'}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Katılım</p>
                                            <p className="text-white font-bold text-sm">
                                                {new Date(profile?.created_at).toLocaleDateString('tr-TR')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Statistics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-[#22c55e]/30 transition-colors">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-5xl">trophy</span>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-3xl font-black text-white mb-1 group-hover:text-[#22c55e] transition-colors">{wins}</p>
                                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Çözülen Vaka</p>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#22c55e] to-transparent opacity-50"></div>
                            </div>

                            <div className="bg-[#151515] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-[#dc2828]/30 transition-colors">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-5xl">skull</span>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-3xl font-black text-white mb-1 group-hover:text-[#dc2828] transition-colors">{losses}</p>
                                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Faili Meçhul</p>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#dc2828] to-transparent opacity-50"></div>
                            </div>

                            <div className="col-span-2 bg-[#151515] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-[#3b82f6]/30 transition-colors">
                                <div className="flex items-end justify-between relative z-10">
                                    <div>
                                        <p className="text-4xl font-black text-white mb-1 group-hover:text-[#3b82f6] transition-colors">%{winRate}</p>
                                        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Başarı Oranı</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-full border-4 border-white/10 flex items-center justify-center relative">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                className="text-white/5"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="text-[#3b82f6] transition-all duration-1000 ease-out"
                                                strokeDasharray={`${winRate}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Game History */}
                    <div className="lg:col-span-8">
                        <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden min-h-[600px] flex flex-col relative">
                            {/* Decorative Top Bar */}
                            <div className="h-2 bg-gradient-to-r from-[#dc2828] via-[#d4af37] to-[#dc2828] w-full"></div>

                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white mb-1 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[#d4af37]">folder_open</span>
                                        Vaka Dosyaları
                                    </h3>
                                    <p className="text-white/40 text-sm">Son görev kayıtları ve soruşturma detayları</p>
                                </div>
                                <div className="bg-white/5 text-white/60 px-4 py-2 rounded-xl text-xs font-bold border border-white/5">
                                    TOPLAM: {totalGames} KAYIT
                                </div>
                            </div>

                            <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
                                {history.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none pb-20">
                                        <span className="material-symbols-outlined text-8xl mb-4">search_off</span>
                                        <p className="text-xl font-bold">Kayıt Bulunamadı</p>
                                        <p className="text-sm">Henüz çözülmüş bir vakanız yok dedektif.</p>
                                    </div>
                                ) : (
                                    history.map((game, i) => (
                                        <div
                                            key={game.id}
                                            className="group bg-[#1a1a1a] hover:bg-[#222] border border-white/5 hover:border-white/20 p-5 rounded-2xl transition-all duration-300 relative overflow-hidden"
                                        >
                                            {/* Status Colored Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${game.room?.outcome === 'WON' ? 'bg-[#22c55e]' : game.room?.outcome === 'LOST' ? 'bg-[#dc2828]' : 'bg-gray-500'}`}></div>

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${game.room?.outcome === 'WON' ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]' : game.room?.outcome === 'LOST' ? 'bg-[#dc2828]/10 border-[#dc2828]/30 text-[#dc2828]' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                                        <span className="material-symbols-outlined text-2xl">
                                                            {game.room?.outcome === 'WON' ? 'check_circle' : game.room?.outcome === 'LOST' ? 'cancel' : 'help'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white mb-1 group-hover:text-[#d4af37] transition-colors">
                                                            {game.room?.title || 'Bilinmeyen Vaka'}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-xs text-white/40">
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">schedule</span>
                                                                {new Date(game.created_at).toLocaleDateString('tr-TR')}
                                                            </div>
                                                            <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">alarm_on</span>
                                                                {game.room?.duration || '15:00'} dk
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 md:pr-4">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-0.5">Rol</p>
                                                        <p className="text-sm font-bold text-white bg-white/5 px-3 py-1 rounded-md border border-white/10">
                                                            {game.role === 'DETECTIVE_A' ? 'Baş Dedektif' : game.role === 'DETECTIVE_B' ? 'Yardımcı Dedektif' : game.role}
                                                        </p>
                                                    </div>
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-0.5">Ekip</p>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="material-symbols-outlined text-white/60 text-sm">group</span>
                                                            <span className="text-sm font-bold text-white">{game.room?.playerCount || 2} Kişi</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-0.5">Sonuç</p>
                                                        <span className={`text-sm font-black px-3 py-1 rounded-lg border ${game.room?.outcome === 'WON'
                                                            ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
                                                            : game.room?.outcome === 'LOST'
                                                                ? 'bg-[#dc2828]/10 border-[#dc2828]/30 text-[#dc2828]'
                                                                : 'bg-white/5 border-white/10 text-white/50'
                                                            }`}>
                                                            {game.room?.outcome === 'WON' ? 'BAŞARILI' : game.room?.outcome === 'LOST' ? 'BAŞARISIZ' : 'YARIDA KALDI'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
