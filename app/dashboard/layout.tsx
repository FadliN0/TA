'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ToastProvider } from '@/components/ui/Alert';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); 
  const supabase = createClientComponentClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // === STATE KEAMANAN & USER ===
  const [isChecking, setIsChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // === FUNGSI PENGECEKAN TIKET LOGIN ===
  useEffect(() => {
    const loadRole = async () => {
      // 1. Ambil data session DAN tangkap error-nya
      const { data: { session }, error } = await supabase.auth.getSession();

      // 2. CEGAT ERROR NYANGKUT (Ini inti solusinya!)
      if (error) {
        console.error("Auth Error:", error.message);
        if (error.message.includes('refresh_token_not_found') || error.name === 'AuthApiError') {
          await supabase.auth.signOut(); // Bersihkan sisa token rusak
          router.replace('/login'); // Paksa kembali ke login
          return;
        }
      }

      // 3. Fallback jika session kosong (jangan dibiarkan loading selamanya)
      if (!session) {
        setIsChecking(false); // Matikan loading
        router.replace('/login'); // Jangan hanya mengandalkan middleware
        return; 
      }
      
      setUserEmail(session.user.email ?? '');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      setUserRole(profile?.role?.toLowerCase() ?? 'unauthorized');
      setIsChecking(false); // Selesai loading
    };

    loadRole();
  }, [router, supabase]); // Tambahkan dependency yang baik

  // === FUNGSI LOGOUT ===
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  // Daftar Menu Navigasi
  const navItems = [
    { 
      name: 'Beranda', 
      href: '/dashboard', 
      exact: true, 
      allowedRoles: ['admin', 'atasan'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> )
    },
    { 
      name: 'Master Produk', 
      href: '/dashboard/products', 
      allowedRoles: ['admin'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> )
    },
    { 
      name: 'Master Pelanggan', 
      href: '/dashboard/customers', 
      allowedRoles: ['admin'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> )
    },
    { 
      name: 'Penawaran (QO)', 
      href: '/dashboard/quotations', 
      allowedRoles: ['admin'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> )
    },
    { 
      name: 'Pesanan (SO)', 
      href: '/dashboard/sales-orders', 
      allowedRoles: ['admin'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> )
    },
    { 
      name: 'Surat Jalan (DO)', 
      href: '/dashboard/delivery-orders', 
      allowedRoles: ['admin'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> )
    },
    { 
      name: 'Tagihan (Invoice)', 
      href: '/dashboard/invoices', 
      allowedRoles: ['admin', 'atasan'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg> )
    },
    { 
      name: 'Pusat Laporan', 
      href: '/dashboard/reports', 
      allowedRoles: ['admin', 'atasan'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> )
    },
    { 
      name: 'Pelanggan', 
      href: '/dashboard/reports', 
      allowedRoles: ['admin', 'atasan'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> )
    },
    { 
      name: 'Tracking Dokumen', 
      href: '/dashboard/tracking', // Sesuaikan dengan nama foldernya
      allowedRoles: [ 'manager'], 
      icon: '🔎' 
    },
    { 
      name: 'Target & KPI (Bos)', 
      href: '/dashboard/customer-targets', 
      allowedRoles: ['atasan'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> )
    },
    { 
      name: 'Manajemen Akun', 
      href: '/dashboard/users', 
      allowedRoles: ['atasan'], 
      icon: ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> )
    },
    
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (userRole) {
      return item.allowedRoles.includes(userRole);
    }
    return false; 
  });

  // TAMPILAN LOADING SEMENTARA
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-gray-600">Memverifikasi Akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:bg-white print:overflow-visible">
      
      {/* ─── SIDEBAR DESKTOP ─── */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white transition-all duration-300 print:hidden">
        {/* Area Logo & Brand */}
        <div className="flex items-center gap-3 px-6 py-6 bg-slate-950/50 border-b border-slate-800">
          <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0">
            <img src="/logo1.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-wide text-amber-500 leading-tight">H!-Part</h2>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Administration</p>
          </div>
        </div>

        {/* Area Navigasi */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Menu Utama</p>
          {filteredNavItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Profil User & Tombol Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
              {userEmail?.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate" title={userEmail || ''}>{userEmail}</p>
              <p className="text-[10px] text-emerald-400 truncate font-bold uppercase">{userRole}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-transparent hover:border-red-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* ─── KONTEN UTAMA (KANAN) ─── */}
      <div className="flex-1 flex flex-col min-w-0 print:block">
        
        {/* HEADER MOBILE (Hanya Tampil di HP) */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded p-0.5">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-lg">H-Part</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </header>

        {/* MENU MOBILE (Dropdown) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-2 print:hidden z-50">
            {filteredNavItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
            
            <div className="pt-2 mt-2 border-t border-slate-700">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-400 hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar Sistem
              </button>
            </div>
          </div>
        )}

        {/* AREA HALAMAN (Page Content) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible relative">
          <ToastProvider>
            {children}
          </ToastProvider>
        </main>

      </div>
    </div>
  );
}