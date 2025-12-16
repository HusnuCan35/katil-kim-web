'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
                        username: username
                    }
                }
            });

            if (signUpError) throw signUpError;

            alert("Kayıt başarılı! Giriş yapabilirsiniz.");
            router.push('/login');
        } catch (err: any) {
            setError(err.message || "Kayıt olurken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-pattern text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/3 w-96 h-96 bg-[#dc2828]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-[#d4af37]/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-white transition-all flex items-center gap-2 group z-10">
                <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                Ana Menü
            </Link>

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-[#d4af37]/10 border border-[#d4af37]/30 px-4 py-1.5 rounded-full text-sm text-[#d4af37]">
                        <span className="material-symbols-outlined text-base">person_add</span>
                        <span>Yeni Dedektif</span>
                    </div>
                    <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-gradient tracking-tight">KAYIT OL</h1>
                    <p className="text-gray-400">Yeni bir dedektif aramıza katılıyor.</p>
                </div>

                {/* Register Form */}
                <form onSubmit={handleRegister} className="glass-card rounded-2xl p-6 space-y-4">
                    {error && (
                        <div className="bg-[#dc2828]/10 border border-[#dc2828]/30 p-4 rounded-xl text-[#ff4d4d] text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase ml-1">
                                <span className="material-symbols-outlined text-sm text-[#d4af37]">person</span>
                                Kullanıcı Adı
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="DedektifKonan"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/50 border border-[#333] rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase ml-1">
                                <span className="material-symbols-outlined text-sm text-[#dc2828]">mail</span>
                                E-posta Adresi
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="dedektif@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-[#333] rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#dc2828] focus:shadow-neon transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase ml-1">
                                <span className="material-symbols-outlined text-sm text-[#dc2828]">lock</span>
                                Şifre
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-[#333] rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#dc2828] focus:shadow-neon transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#8b0000] to-[#dc2828] hover:from-[#a00] hover:to-[#e63333] disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-neon transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-white"></div>
                        ) : (
                            <span className="material-symbols-outlined">person_add</span>
                        )}
                        <span className="tracking-wide">Kayıt Ol</span>
                    </button>
                </form>

                {/* Login Link */}
                <div className="text-center text-sm text-gray-500">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/login" className="text-[#dc2828] hover:text-[#ff4d4d] font-bold transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="fixed bottom-8 left-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-8xl text-[#d4af37]">local_police</span>
            </div>
        </main>
    );
}
