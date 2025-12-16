'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            router.push('/');
        } catch (err: any) {
            setError(err.message || "Giriş yapılırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-pattern text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#dc2828]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#d4af37]/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-white transition-all flex items-center gap-2 group z-10">
                <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                Ana Menü
            </Link>

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-[#dc2828]/10 border border-[#dc2828]/30 px-4 py-1.5 rounded-full text-sm text-[#ff4d4d]">
                        <span className="material-symbols-outlined text-base">badge</span>
                        <span>Dedektif Kimliği</span>
                    </div>
                    <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-gradient tracking-tight">GİRİŞ YAP</h1>
                    <p className="text-gray-400">Dedektif kimliğinize erişin.</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="glass-card rounded-2xl p-6 space-y-4">
                    {error && (
                        <div className="bg-[#dc2828]/10 border border-[#dc2828]/30 p-4 rounded-xl text-[#ff4d4d] text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
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
                            <span className="material-symbols-outlined">login</span>
                        )}
                        <span className="tracking-wide">Giriş Yap</span>
                    </button>
                </form>

                {/* Register Link */}
                <div className="text-center text-sm text-gray-500">
                    Hesabınız yok mu?{' '}
                    <Link href="/register" className="text-[#dc2828] hover:text-[#ff4d4d] font-bold transition-colors">
                        Kayıt Ol
                    </Link>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="fixed bottom-8 right-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-8xl text-[#dc2828]">fingerprint</span>
            </div>
        </main>
    );
}
