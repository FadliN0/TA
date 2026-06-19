'use client';

import React from 'react';
import Link from 'next/link';
import SalesTrendChart from '@/components/SalesTrendChart';

interface Props {
  userName: string;
  kpi: { omsetBulanIni: number; piutangBeredar: number; pesananAktif: number };
  recentTrx: any[];
  chartData: { bulan: string; total: number }[];
}

export default function DashboardClient({ userName, kpi, recentTrx, chartData }: Props) {
  
  const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{getGreeting()}, <span className="text-blue-600 capitalize">{userName}</span>! 👋</h1>
          <p className="text-sm text-slate-500 mt-1">Berikut adalah ringkasan performa operasional hari ini.</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tanggal Hari Ini</p>
          <p className="text-lg font-bold text-slate-800">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* --- LANTAI 1: KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg shadow-blue-900/20 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Total Penjualan (Bulan Ini)</p>
            <h2 className="text-3xl font-black">{fmtRp(kpi.omsetBulanIni)}</h2>
          </div>
          <svg className="absolute -bottom-4 -right-4 w-32 h-32 text-blue-500/30" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-700 p-6 rounded-2xl shadow-lg shadow-red-900/20 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-red-100 text-sm font-bold uppercase tracking-wider mb-1">Sisa Piutang Berjalan</p>
            <h2 className="text-3xl font-black">{fmtRp(kpi.piutangBeredar)}</h2>
          </div>
          <svg className="absolute -bottom-4 -right-4 w-32 h-32 text-red-400/30" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-6 rounded-2xl shadow-lg shadow-emerald-900/20 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Pesanan Sedang Diproses</p>
            <h2 className="text-3xl font-black">{kpi.pesananAktif} <span className="text-lg font-medium opacity-80">Dokumen SO</span></h2>
          </div>
          <svg className="absolute -bottom-4 -right-4 w-32 h-32 text-emerald-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      </div>

      {/* --- LANTAI 2 & 3: GRAFIK & TABEL --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* AREA GRAFIK */}
        <SalesTrendChart data={chartData} />

        {/* AREA TABEL RECENT TRANSACTIONS */}
        <div className="xl:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Aktivitas Terkini</h3>
            <Link href="/dashboard/reports" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Lihat Semua &rarr;
            </Link>
          </div>
          
          <div className="flex-1 space-y-4">
            {recentTrx.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Belum ada transaksi.</p>
            ) : (
              recentTrx.map((trx, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    trx.delivery_status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate" title={trx.company_name}>{trx.company_name}</p>
                    <p className="text-[10px] font-mono text-slate-500">{trx.so_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">{fmtRp(trx.total_order_value)}</p>
                    <p className={`text-[10px] font-bold uppercase ${trx.payment_status === 'Paid' ? 'text-green-500' : 'text-red-500'}`}>
                      {trx.payment_status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}