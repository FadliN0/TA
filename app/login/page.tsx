'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi dinamis agar bisa dipakai oleh Admin biasa maupun Guest
  const performLogin = async (loginEmail: string, loginPass: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password: loginPass 
      });

      if (authErr) throw authErr;

      router.refresh();
      router.push('/dashboard'); 
      
    } catch (err: any) {
      // Menampilkan pesan error asli di kotak merah
      console.error("Error dari Supabase:", err);
      setError(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleGuestLogin = () => {
    // Kredensial akun boneka (Dummy) untuk keperluan Portofolio
    performLogin('guest@hjp.co.id', 'guest12345');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-300">
        <h2 className="text-3xl font-black text-slate-800 text-center mb-2">CV HJP</h2>
        <p className="text-center text-slate-500 text-sm mb-8 font-medium">Sistem Administrasi B2B</p>
        
        {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-black border border-rose-100 uppercase tracking-wider mb-5">{error}</div>}
        
        {/* FORM LOGIN UTAMA */}
        <form onSubmit={handleManualLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Email Kantor</label>
            <input 
              type="email" 
              required 
              className="w-full border-2 border-slate-100 p-3.5 rounded-2xl outline-none focus:border-blue-500 transition-colors font-bold text-slate-700" 
              placeholder="admin@hjp.co.id" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full border-2 border-slate-100 p-3.5 rounded-2xl outline-none focus:border-blue-500 transition-colors font-bold text-slate-700" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          
          <button disabled={isLoading} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 disabled:bg-slate-300">
            {isLoading ? 'MEMVERIFIKASI...' : 'MASUK KE DASHBOARD'}
          </button>
        </form>

        {/* GARIS PEMISAH */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atau</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* TOMBOL GUEST / PORTOFOLIO */}
        <button 
          onClick={handleGuestLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 p-4 rounded-2xl font-black hover:bg-emerald-100 transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          MASUK SEBAGAI GUEST
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
          Klik tombol di atas untuk mereview portofolio ini tanpa login.
        </p>

      </div>
    </div>
  );
}   