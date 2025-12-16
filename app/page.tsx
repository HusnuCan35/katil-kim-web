'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState('');

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data) {
          setProfile(data);
          setUsername(data.username);
        }
      }
      setAuthLoading(false);
    };

    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setUsername('');
  };

  const createRoom = async () => {
    if (!username.trim()) {
      alert('Lütfen bir isim girin!');
      return;
    }
    setIsCreating(true);
    try {
      let selectedCase = null;

      const { count, error: countError } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true });

      if (!countError && count && count > 0) {
        const randomOffset = Math.floor(Math.random() * count);
        const { data: randomStory, error: fetchError } = await supabase
          .from('stories')
          .select('content')
          .range(randomOffset, randomOffset)
          .single();

        if (!fetchError && randomStory?.content) {
          selectedCase = randomStory.content;
        }
      }

      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          code,
          status: 'LOBBY',
          custom_case: selectedCase
        }])
        .select()
        .single();

      if (error) throw error;

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: data.id,
          name: username,
          role: 'DETECTIVE_A',
          is_ready: true,
          user_id: session?.user?.id
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      localStorage.setItem('katil_kim_role', 'DETECTIVE_A');
      localStorage.setItem('katil_kim_name', username);
      localStorage.setItem('katil_kim_id', playerData.id);

      router.push(`/lobby/${code}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Oda oluşturulurken bir hata oluştu.');
    } finally {
      setIsCreating(false);
    }
  };

  const createAiRoom = async () => {
    if (!username.trim()) {
      alert('Lütfen bir isim girin!');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const aiResponse = await fetch('/api/generate-story', { method: 'POST' });
      const aiData = await aiResponse.json();

      if (!aiData.success) {
        throw new Error(aiData.error || 'AI generation failed');
      }

      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          code,
          status: 'LOBBY',
          custom_case: aiData.caseData
        }])
        .select()
        .single();

      if (error) throw error;

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: data.id,
          name: username,
          role: 'DETECTIVE_A',
          is_ready: true,
          user_id: session?.user?.id
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      localStorage.setItem('katil_kim_role', 'DETECTIVE_A');
      localStorage.setItem('katil_kim_name', username);
      localStorage.setItem('katil_kim_id', playerData.id);

      router.push(`/lobby/${code}`);
    } catch (error) {
      console.error('Error creating AI room:', error);
      alert('AI hikaye oluşturamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode || !username.trim()) {
      alert('Lütfen isim ve oda kodu girin!');
      return;
    }
    setIsJoining(true);
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', joinCode.toUpperCase())
        .single();

      if (roomError || !room) {
        alert('Oda bulunamadı!');
        return;
      }

      if (room.status !== 'LOBBY') {
        alert('Bu oyun çoktan başlamış!');
        return;
      }

      const { data: existingPlayers, error: countError } = await supabase
        .from('players')
        .select('role')
        .eq('room_id', room.id);

      if (countError) throw countError;

      const playerCount = existingPlayers?.length || 0;

      if (playerCount >= 4) {
        alert('Oda dolu! (Maksimum 4 kişi)');
        return;
      }

      let newRole = 'DETECTIVE_B';
      const aCount = existingPlayers.filter(p => p.role === 'DETECTIVE_A').length;
      const bCount = existingPlayers.filter(p => p.role === 'DETECTIVE_B').length;

      if (aCount <= bCount) {
        newRole = 'DETECTIVE_A';
      } else {
        newRole = 'DETECTIVE_B';
      }

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: room.id,
          name: username,
          role: newRole,
          is_ready: true,
          user_id: session?.user?.id
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      localStorage.setItem('katil_kim_role', newRole);
      localStorage.setItem('katil_kim_name', username);
      localStorage.setItem('katil_kim_id', playerData.id);

      router.push(`/lobby/${joinCode.toUpperCase()}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Odaya katılırken bir hata oluştu.');
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f0f0f] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#333] rounded-full animate-spin border-t-[#dc2828]"></div>
          <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#dc2828] text-2xl">fingerprint</span>
        </div>
        <p className="text-gray-500 text-sm font-medium">Kimlik doğrulanıyor...</p>
      </div>
    </main>
  );

  return (
    <main className="flex min-h-screen flex-col bg-pattern text-white relative overflow-hidden">

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#dc2828]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-[#dc2828]/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-[#0f0f0f]/80 backdrop-blur-xl border-b border-[#333] relative z-20">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#dc2828] text-2xl filled" style={{ fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
              <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold tracking-tight text-white leading-none">
                Katil <span className="text-[#dc2828]">Kim?</span>
              </h1>
            </div>

            {/* Auth Badge */}
            {session ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-gradient-to-r from-gray-900 via-[#1a1a1a] to-gray-900 border border-[#d4af37]/20 shadow-lg hover:border-[#d4af37]/40 transition-all"
                >
                  <div className="flex flex-col items-end pr-2 leading-tight">
                    <span className="text-[9px] uppercase tracking-widest text-[#d4af37]/80 font-bold">Rol</span>
                    <span className="text-xs font-[family-name:var(--font-playfair)] font-bold text-white">Baş Dedektif</span>
                  </div>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#dc2828] to-[#8b0000] flex items-center justify-center border border-[#d4af37]/40">
                      <span className="material-symbols-outlined text-white text-sm">person</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1a1a]"></div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full bg-[#1a1a1a] border border-[#333] hover:border-[#dc2828]/50 hover:bg-[#dc2828]/10 transition-all group"
                  title="Çıkış Yap"
                >
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-[#dc2828] text-lg transition-colors">logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] px-4 py-2 rounded-full transition-all font-bold text-sm border border-[#333] hover:border-[#d4af37]/40"
              >
                <span className="material-symbols-outlined text-[#dc2828] text-lg">login</span>
                <span>Giriş Yap</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md space-y-8">

          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#dc2828]/10 border border-[#dc2828]/30 px-4 py-1.5 rounded-full text-sm text-[#ff4d4d]">
              <span className="material-symbols-outlined text-base animate-pulse">military_tech</span>
              <span>2 Kişilik Co-op Dedektiflik</span>
            </div>

            <h2 className="font-[family-name:var(--font-playfair)] text-5xl sm:text-6xl font-bold tracking-tight">
              <span className="text-gradient">KATİL</span>
              <span className="text-white"> KİM?</span>
            </h2>

            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Arkadaşınla birlikte kanıtları incele, şüphelileri sorgula ve katili bul!
            </p>
          </div>

          {/* Main Card */}
          <div className="glass-card rounded-2xl p-6 shadow-lg animate-float" style={{ animationDuration: '6s' }}>

            {/* Welcome Message for Logged In Users */}
            {session ? (
              <div className="bg-green-900/20 border border-green-900/30 p-4 rounded-xl mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-green-400">verified_user</span>
                </div>
                <div>
                  <p className="text-green-400 font-bold">Hoşgeldin, {username}</p>
                  <p className="text-xs text-green-400/70">Dedektiflik kimliğin doğrulandı.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase ml-1">
                  <span className="material-symbols-outlined text-sm text-[#dc2828]">badge</span>
                  Dedektif İsmi
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="İSMİNİZ"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/50 border border-[#333] rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#dc2828] focus:shadow-neon transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent"></div>
              <span className="material-symbols-outlined text-[#dc2828] text-sm">mystery</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent"></div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">

              {/* Classic Game Button */}
              <button
                onClick={createRoom}
                disabled={isCreating || isJoining || !username}
                className="w-full bg-gradient-to-r from-[#8b0000] to-[#dc2828] hover:from-[#a00] hover:to-[#e63333] border border-[#dc2828]/30 text-white font-bold py-4 rounded-xl shadow-neon transition-all flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                {isCreating ? (
                  <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-white"></div>
                ) : (
                  <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">add_circle</span>
                )}
                <span className="tracking-wide">Yeni Oyun Kur (Klasik)</span>
              </button>

              {/* AI Story Button */}
              <button
                onClick={createAiRoom}
                disabled={isCreating || isJoining || !username || isGeneratingAi}
                className="w-full bg-gradient-to-r from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600 border border-purple-500/30 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                {isGeneratingAi ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-white"></div>
                    <span className="tracking-wide">AI Hikaye Yazıyor...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">auto_awesome</span>
                    <span className="tracking-wide">AI ile Yeni Hikaye Yaz</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#333]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1a1a1a] px-3 text-gray-500 font-medium">veya odaya katıl</span>
                </div>
              </div>

              {/* Join Room */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="KODU GİR"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/50 border border-[#333] rounded-xl px-4 py-3.5 text-center tracking-[0.3em] font-mono uppercase focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all placeholder:text-gray-600 placeholder:tracking-normal"
                    maxLength={4}
                  />
                </div>
                <button
                  onClick={joinRoom}
                  disabled={isCreating || isJoining || !joinCode || !username}
                  className="px-6 font-bold bg-white text-black hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isJoining ? (
                    <div className="w-5 h-5 border-2 border-black/30 rounded-full animate-spin border-t-black"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform text-lg">arrow_forward</span>
                      <span>Katıl</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex justify-center gap-6 text-gray-500 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>2-4 Oyuncu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>30-60 dk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">psychology</span>
              <span>Strateji</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-4 left-4 opacity-20 pointer-events-none">
        <span className="material-symbols-outlined text-6xl text-[#dc2828]">search</span>
      </div>
      <div className="fixed top-1/4 right-4 opacity-10 pointer-events-none rotate-12">
        <span className="material-symbols-outlined text-8xl text-white">local_police</span>
      </div>
    </main>
  );
}
