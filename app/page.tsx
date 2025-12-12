'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, Plus, Sparkles, LogIn, LogOut, User } from 'lucide-react';
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
        // Fetch Profile
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
      // 1. Try to fetch a random story from the DB
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
          console.log("Selected Random Story from DB");
          selectedCase = randomStory.content;
        }
      }

      // 2. Generate Room Code
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      // 3. Create Room (with selected case if found)
      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          code,
          status: 'LOBBY',
          custom_case: selectedCase // If null, game page defaults to CASE_1
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
          user_id: session?.user?.id // Save real user ID for stats
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      // Save player info
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
      // 1. Generate Story from AI
      const aiResponse = await fetch('/api/generate-story', { method: 'POST' });
      const aiData = await aiResponse.json();

      if (!aiData.success) {
        throw new Error(aiData.error || 'AI generation failed');
      }

      // 2. Create Room with Custom Data
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

      // 3. Create Host
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
      // Find the room
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

      // Check existing players to determine role
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

      // Assign role cyclically
      let newRole = 'DETECTIVE_B';
      const aCount = existingPlayers.filter(p => p.role === 'DETECTIVE_A').length;
      const bCount = existingPlayers.filter(p => p.role === 'DETECTIVE_B').length;

      if (aCount <= bCount) {
        newRole = 'DETECTIVE_A';
      } else {
        newRole = 'DETECTIVE_B';
      }

      // Join
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: room.id,
          name: username,
          role: newRole,
          is_ready: true,
          user_id: session?.user?.id // Save real user ID for stats
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
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <Loader2 className="w-8 h-8 animate-spin text-red-600" />
    </main>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-100 relative">

      {/* Auth Header */}
      <div className="absolute top-4 right-4 z-10">
        {session ? (
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex items-center gap-4 bg-neutral-900 hover:bg-neutral-800 rounded-full pl-4 pr-2 py-2 border border-neutral-800 transition-colors">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-red-500" />
                <span className="font-bold text-sm">{profile?.username || 'Kullanıcı'}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 px-4 py-2 rounded-xl transition-colors font-bold text-sm border border-neutral-800"
          >
            <LogIn className="w-4 h-4" />
            Giriş Yap
          </Link>
        )}
      </div>

      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tighter text-red-600">KATİL KİM?</h1>
          <p className="text-neutral-400">2 Kişilik Co-op Dedektiflik Oyunu</p>
        </div>

        <div className="grid gap-4 p-6 border border-neutral-800 rounded-2xl bg-neutral-900/50 backdrop-blur-sm">
          {!session && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-neutral-500 uppercase ml-1">Dedektif İsmi</label>
              <input
                type="text"
                placeholder="İSMİNİZ"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
          )}

          {session && (
            <div className="text-left bg-green-900/20 border border-green-900/30 p-4 rounded-xl">
              <p className="text-green-400 text-sm font-bold">Hoşgeldin, {username}</p>
              <p className="text-xs text-green-400/70">Dedektiflik kimliğin doğrulandı.</p>
            </div>
          )}

          <div className="h-px bg-neutral-800 my-2" />

          <button
            onClick={createRoom}
            disabled={isCreating || isJoining || !username}
            className="flex items-center justify-center gap-2 w-full py-4 text-lg font-semibold bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? <Loader2 className="animate-spin" /> : <Plus />}
            Yeni Oyun Kur (Klasik)
          </button>

          <button
            onClick={createAiRoom}
            disabled={isCreating || isJoining || !username}
            className="flex items-center justify-center gap-2 w-full py-4 text-lg font-semibold bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
          >
            {isGeneratingAi ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
            AI ile Yeni Hikaye Yaz
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-neutral-900 px-2 text-neutral-500">veya</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ODA KODU"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center tracking-widest font-mono uppercase focus:outline-none focus:border-red-600 transition-colors"
              maxLength={4}
            />
            <button
              onClick={joinRoom}
              disabled={isCreating || isJoining || !joinCode || !username}
              className="px-6 font-semibold bg-neutral-100 text-neutral-950 hover:bg-neutral-300 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? <Loader2 className="animate-spin" /> : 'Katıl'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
