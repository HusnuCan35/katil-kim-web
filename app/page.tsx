'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, Plus, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState('');

  const createRoom = async () => {
    if (!username.trim()) {
      alert('Lütfen bir isim girin!');
      return;
    }
    setIsCreating(true);
    try {
      // Generate a random 4-character code
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      const { data, error } = await supabase
        .from('rooms')
        .insert([{ code, status: 'LOBBY' }])
        .select()
        .single();

      if (error) throw error;

      // Create the host player
      const { error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: data.id,
          name: username,
          role: 'DETECTIVE_A',
          is_ready: true
        }]);

      if (playerError) throw playerError;

      // Save player info
      localStorage.setItem('katil_kim_role', 'DETECTIVE_A');
      localStorage.setItem('katil_kim_name', username);

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
      const { error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: data.id,
          name: username,
          role: 'DETECTIVE_A',
          is_ready: true
        }]);

      if (playerError) throw playerError;

      localStorage.setItem('katil_kim_role', 'DETECTIVE_A');
      localStorage.setItem('katil_kim_name', username);

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

      // Check if room is full (max 2 players)
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      if (count && count >= 2) {
        alert('Oda dolu!');
        return;
      }

      // Join as second player
      const { error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: room.id,
          name: username,
          role: 'DETECTIVE_B',
          is_ready: true
        }]);

      if (playerError) throw playerError;

      localStorage.setItem('katil_kim_role', 'DETECTIVE_B');
      localStorage.setItem('katil_kim_name', username);
      router.push(`/lobby/${joinCode.toUpperCase()}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Odaya katılırken bir hata oluştu.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-100">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tighter text-red-600">KATİL KİM?</h1>
          <p className="text-neutral-400">2 Kişilik Co-op Dedektiflik Oyunu</p>
        </div>

        <div className="grid gap-4 p-6 border border-neutral-800 rounded-2xl bg-neutral-900/50 backdrop-blur-sm">
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
