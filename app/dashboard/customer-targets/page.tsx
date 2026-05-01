'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TargetManagementPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [companyTarget, setCompanyTarget] = useState(0);
  const [companyTargetId, setCompanyTargetId] = useState<string | null>(null);
  const [companyActual, setCompanyActual] = useState(0);
  const [customerData, setCustomerData] = useState<any[]>([]);

  // State untuk Drill-down (Expand Baris)
  const [expandedCustId, setExpandedCustId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: compTarget } = await supabase.from('company_targets').select('*').eq('month', month).eq('year', year).maybeSingle();
      setCompanyTargetId(compTarget?.id || null);
      setCompanyTarget(compTarget?.target_amount || 0);

      const { data: allSales } = await supabase.from('v_transaction_lifecycle').select('customer_id, total_order_value, so_date');
      const filteredSales = allSales?.filter(trx => {
        const d = new Date(trx.so_date);
        return (d.getMonth() + 1) === month && d.getFullYear() === year;
      }) || [];

      setCompanyActual(filteredSales.reduce((sum, item) => sum + Number(item.total_order_value), 0));

      const { data: custTargets } = await supabase.from('customer_targets').select('*').eq('month', month).eq('year', year);
      const { data: customers } = await supabase.from('customers').select('id, company_name').order('company_name');

      const report = customers?.map(cust => {
        const targetAmount = custTargets?.find(t => t.customer_id === cust.id)?.target_amount || 0;
        const actual = filteredSales.filter(s => s.customer_id === cust.id).reduce((sum, item) => sum + Number(item.total_order_value), 0);
        return { 
          id: cust.id, name: cust.company_name, target: targetAmount, 
          target_id: custTargets?.find(t => t.customer_id === cust.id)?.id,
          actual, percent: targetAmount > 0 ? (actual / targetAmount) * 100 : 0 
        };
      }) || [];

      setCustomerData(report);
    } finally { setLoading(false); }
  };

  // FUNGSI EXPAND & PERBAIKAN LOGIKA GRAFIK
  const handleExpandRow = async (cust: any) => {
    if (expandedCustId === cust.id) {
      setExpandedCustId(null);
      return;
    }
    setExpandedCustId(cust.id);
    setHistoryLoading(true);

    try {
      const { data } = await supabase.from('v_transaction_lifecycle')
        .select('total_order_value, so_date')
        .eq('customer_id', cust.id)
        .order('so_date', { ascending: false });

      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      const trend = [];
      
      // PERBAIKAN: Hitung 6 bulan mundur berdasarkan filter Bulan & Tahun yang dipilih Bos
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1, 1);
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        
        const total = data?.filter(trx => {
          const td = new Date(trx.so_date);
          return td.getMonth() === m && td.getFullYear() === y;
        }).reduce((sum, item) => sum + Number(item.total_order_value), 0) || 0;
        
        trend.push({ label: months[m], value: total });
      }
      setHistoryData(trend);
    } finally { setHistoryLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, [month, year]);

  const saveCompTarget = async (val: string) => {
    const num = Number(val);
    setSaving(true);
    await supabase.from('company_targets').upsert({ month, year, target_amount: num }, { onConflict: 'month,year' });
    await fetchAllData();
    setSaving(false);
  };

  const saveCustTarget = async (custId: string, targetId: string | undefined, val: string) => {
    const num = Number(val);
    setSaving(true);
    await supabase.from('customer_targets').upsert({ customer_id: custId, month, year, target_amount: num }, { onConflict: 'customer_id,month,year' });
    await fetchAllData();
    setSaving(false);
  };

  const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;
  const compPercent = companyTarget > 0 ? (companyActual / companyTarget) * 100 : 0;
  
  // Ambil nilai tertinggi untuk patokan 100% tinggi grafik
  const maxHistory = Math.max(...historyData.map(h => h.value), 1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-blue-600 text-white rounded-lg">📊</span>
            KPI & Target Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">{saving ? <span className="text-blue-600 font-bold animate-pulse">💾 Menyimpan Perubahan...</span> : 'Atur target makro dan pantau performa mikro klien.'}</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm outline-none">
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Bulan {i+1}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white px-4 py-2 rounded-lg font-bold text-sm w-24 text-center shadow-sm outline-none" />
        </div>
      </div>

      {/* MAINC CHART: COMPANY TARGET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Set Target Perusahaan</p>
            <div className="flex items-center gap-2 border-b-2 border-blue-100 pb-2 focus-within:border-blue-600 transition-colors">
              <span className="text-xl font-bold text-blue-300">Rp</span>
              <input 
                type="number" defaultValue={companyTarget || ''}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                onBlur={(e) => saveCompTarget(e.target.value)}
                className="text-3xl font-black text-slate-900 w-full outline-none bg-transparent"
              />
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span>Realisasi: {fmtRp(companyActual)}</span>
              <span className={compPercent >= 100 ? 'text-green-600' : 'text-blue-600'}>{compPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${compPercent >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(compPercent, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* VISUAL GAUGE AREA */}
        <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-transparent"></div>
           <div className="text-center z-10">
              <div className="text-5xl font-black text-white mb-2">{compPercent.toFixed(0)}%</div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Total Achievement Perusahaan</div>
              <div className="mt-4 flex gap-1 justify-center">
                {Array.from({length: 20}).map((_, i) => (
                  <div key={i} className={`w-1.5 h-6 rounded-full ${i/20 * 100 < compPercent ? (compPercent >= 100 ? 'bg-green-500' : 'bg-blue-500') : 'bg-slate-700'}`}></div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* CUSTOMER LIST WITH DRILL DOWN */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b">
            <tr>
              <th className="p-4 w-10"></th>
              <th className="p-4">Customer</th>
              <th className="p-4 w-64 text-center">Set Target Klien</th>
              <th className="p-4 text-right">Actual Omset</th>
              <th className="p-4 w-60">Achievement</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customerData.map((item) => {
              const isExpanded = expandedCustId === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`} onClick={() => handleExpandRow(item)}>
                    <td className="p-4 text-center text-slate-400">{isExpanded ? '▼' : '▶'}</td>
                    <td className="p-4 font-bold text-slate-800">{item.name}</td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                       <input 
                         type="number" defaultValue={item.target || ''}
                         onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                         onBlur={(e) => saveCustTarget(item.id, item.target_id, e.target.value)}
                         className="w-full border rounded-lg p-2 text-center font-bold text-blue-700 outline-none focus:border-blue-600 bg-white"
                       />
                    </td>
                    <td className="p-4 text-right font-bold text-slate-700">{fmtRp(item.actual)}</td>
                    <td className="p-4">
                       <div className="flex items-center gap-2">
                         <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                           <div className={`h-full ${item.percent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(item.percent, 100)}%` }}></div>
                         </div>
                         <span className="text-[10px] font-black w-8 text-right" style={{ color: item.percent >= 100 ? '#10b981' : '#475569' }}>
                           {item.percent.toFixed(0)}%
                         </span>
                       </div>
                    </td>
                  </tr>
                  
                  {/* DRILL DOWN CHART AREA (SUDAH DIPERBAIKI) */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 p-6 border-b">
                         <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-full md:w-1/3">
                               <h4 className="font-black text-slate-900 text-sm mb-1">Tren Belanja: {item.name}</h4>
                               <p className="text-xs text-slate-500">Analisis riwayat transaksi 6 bulan ke belakang berdasarkan periode terpilih.</p>
                            </div>
                            
                            {/* WADAH GRAFIK - WAJIB MENGGUNAKAN h-full dan justify-end AGAR GRAFIK TIDAK MENGECIL JADI 0 */}
                            <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 h-32 border-b border-slate-200 pb-2 w-full pt-4">
                               {historyLoading ? (
                                 <div className="text-xs font-bold text-slate-400 animate-pulse w-full text-center">Menghitung riwayat...</div>
                               ) : (
                                historyData.map((h, i) => {
                                 const heightPercent = maxHistory > 0 ? (h.value / maxHistory) * 100 : 0;
                                 return (
                                   // Wrapper pembungkus tiap batang grafik (Wajib h-full)
                                   <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group relative h-full">
                                      {/* Tooltip Hover */}
                                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] p-1 px-2 rounded whitespace-nowrap z-20 transition-opacity">
                                         {fmtRp(h.value)}
                                      </div>
                                      
                                      {/* BATANG GRAFIK YANG SEBENARNYA */}
                                      <div 
                                        className="w-full bg-blue-500 rounded-t-sm transition-all duration-700 group-hover:bg-blue-600" 
                                        style={{ height: `${heightPercent}%`, minHeight: h.value > 0 ? '4px' : '0px' }}
                                      ></div>
                                      
                                      {/* Label Bulan */}
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">{h.label}</span>
                                   </div>
                                 );
                               })
                               )}
                            </div>
                         </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}