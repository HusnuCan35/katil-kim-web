'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { validateMessage } from '@/lib/chat-filter';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validate Username
        if (username.length < 3) {
            setError("Kullanıcı adı en az 3 karakter olmalıdır.");
            setLoading(false);
            return;
        }

        // Check profanity
        const validation = validateMessage(username);
        if (!validation.isValid) {
            setError("Kullanıcı adı uygunsuz içerik barındıramaz.");
            setLoading(false);
            return;
        }

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username // Passed to trigger
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Success
            alert("Kayıt başarılı! Giriş yapabilirsiniz.");
            router.push('/login');
        } catch (err: any) {
            setError(err.message || "Kayıt olurken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black -z-10" />

            <Link href="/" className="absolute top-8 left-8 text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Ana Menü
            </Link>

            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black tracking-tighter text-red-600 mb-2">KAYIT OL</h1>
                    <p className="text-neutral-400">Yeni bir dedektif aramıza katılıyor.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="text"
                            required
                            placeholder="Kullanıcı Adı"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
                        />
                        <input
                            type="email"
                            required
                            placeholder="E-posta Adresi"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
                        />
                        <input
                            type="password"
                            required
                            placeholder="Şifre"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                        Kayıt Ol
                    </button>
                </form>

                <div className="text-center text-sm text-neutral-500">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/login" className="text-red-400 hover:text-red-300 font-bold">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </main>
    );
}
