'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCustomerHistoryAction, saveCompanyTargetAction, saveCustomerTargetAction } from './actions';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconTarget = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconChevron = ({ down }: { down: boolean }) => <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${down ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconTrend = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconSave = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmtRp = (num: number) => {
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${Number(num).toLocaleString('id-ID')}`;
};
const fmtFull = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ pct }: { pct: number }) => {
  if (pct >= 100) return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">ACHIEVED</span>;
  if (pct >= 75) return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">ON TRACK</span>;
  return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">LAGGING</span>;
};

// ─── INLINE PROGRESS BAR ──────────────────────────────────────────────────────
const ProgressBar = ({ pct }: { pct: number }) => {
  const clipped = Math.min(pct, 100);
  const colorClass = pct >= 100 ? 'bg-emerald-500 text-emerald-500' : pct >= 75 ? 'bg-amber-500 text-amber-500' : 'bg-blue-500 text-blue-500';
  
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass.split(' ')[0]}`} style={{ width: `${clipped}%` }} />
      </div>
      <span className={`min-w-[38px] text-right text-xs font-bold tabular-nums ${colorClass.split(' ')[1]}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
};

// ─── CUSTOMER TARGET INPUT ─────────────────────────────
function CustTargetInput({ item, month, year, saving, onSave }: { item: any; month: number; year: number; saving: boolean; onSave: (id: string, val: string) => void; }) {
  const [val, setVal] = React.useState(item.target > 0 ? String(item.target) : '');
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => { 
    setVal(item.target > 0 ? String(item.target) : ''); 
    setDirty(false); 
  }, [item.target, month, year]);

  const handleSave = () => { if (!val.trim() || !dirty) return; onSave(item.id, val); setDirty(false); };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" value={val} placeholder="—"
        onChange={e => { setVal(e.target.value); setDirty(true); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
        className={`flex-1 text-center text-[13px] font-bold text-blue-700 rounded-md px-2 py-1.5 outline-none transition-colors border ${
          dirty ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
        }`}
      />
      {dirty && (
        <button onClick={handleSave} disabled={saving} className={`bg-blue-700 text-white rounded-md px-2 py-1 text-[11px] font-bold shrink-0 ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800'}`}>✓</button>
      )}
    </div>
  );
}

// ─── PROPS DARI SERVER ────────────────────────────────────────────────────────
interface Props {
  initialMonth: number;
  initialYear: number;
  initialCompanyTarget: number;
  initialCustomerData: any[];
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TargetManagementClient({
  initialMonth,
  initialYear,
  initialCompanyTarget,
  initialCustomerData
}: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Sinkronkan input company target ketika props dari Server berubah
  const [compInputVal, setCompInputVal] = useState(initialCompanyTarget > 0 ? String(initialCompanyTarget) : '');
  useEffect(() => {
    setCompInputVal(initialCompanyTarget > 0 ? String(initialCompanyTarget) : '');
  }, [initialCompanyTarget]);

  const [expandedCustId, setExpandedCustId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

  const showSuccess = (msg: string) => { setSaveSuccess(msg); setTimeout(() => setSaveSuccess(null), 3000); };
  const showError = (msg: string) => { setSaveError(msg); setTimeout(() => setSaveError(null), 6000); };

  // Mengubah URL memicu Server Component untuk memuat ulang data secara instan
  const handleFilterChange = (newMonth: number, newYear: number) => {
    router.push(`/dashboard/customer-targets?month=${newMonth}&year=${newYear}`);
  };

  // Menerjemahkan data matang dari Server ke format yang diharapkan oleh UI Anda
  const customerData = initialCustomerData.map(item => ({
    id: item.customer_id,
    name: item.company_name,
    target: Number(item.target_amount || 0),
    target_id: item.target_id,
    actual: Number(item.achieved_amount || 0),
    percent: Number(item.achievement_percentage || 0)
  }));

  const companyActual = customerData.reduce((sum, item) => sum + item.actual, 0);
  const compPercent = initialCompanyTarget > 0 ? (companyActual / initialCompanyTarget) * 100 : 0;
  const maxHistory = Math.max(...historyData.map(h => h.value), 1);
  const gap = initialCompanyTarget - companyActual;

  const achieved = customerData.filter(c => c.percent >= 100).length;
  const onTrack = customerData.filter(c => c.percent >= 75 && c.percent < 100).length;
  const lagging = customerData.filter(c => c.percent < 75).length;

  const handleExpandRow = async (cust: any) => {
    if (expandedCustId === cust.id) { setExpandedCustId(null); return; }
    setExpandedCustId(cust.id);
    setHistoryLoading(true);
    try {
      // Pembacaan grafik histori tidak memerlukan mutasi, jadi bisa memakai client statis
      const res = await getCustomerHistoryAction(cust.id);  // ← panggil server
      const data = res.data;
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(initialYear, initialMonth - 1, 1);
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth(), y = d.getFullYear();
        const total = data?.filter(trx => {
          if (trx.payment_status === 'Uninvoiced') return false;
          if (!trx.invoice_date) return false;
          const td = new Date(trx.invoice_date);
          return td.getMonth() === m && td.getFullYear() === y;
        }).reduce((sum, item) => sum + Number(item.total_order_value), 0) || 0;
        trend.push({ label: monthShort[m], value: total });
      }
      setHistoryData(trend);
    } finally { setHistoryLoading(false); }
  };

  const saveCompTarget = async (val: string) => {
    const num = Number(val.trim());
    if (isNaN(num) || num < 0) { showError('Nilai target tidak valid.'); return; }
    setSaving(true); setSaveError(null);
    try {
      // ─────────────────────────────────────────────────────────────────
      // Menggunakan Server Action, bukan menembak DB langsung dari Klien
      // ─────────────────────────────────────────────────────────────────
      await saveCompanyTargetAction(initialMonth, initialYear, num);
      showSuccess('Company target berhasil disimpan ✓');
    } catch (err: any) { 
      showError(`Error: ${err?.message}`); 
    } finally { 
      setSaving(false); 
    }
  };

  const saveCustTarget = async (custId: string, val: string) => {
    const num = Number(val.trim());
    if (isNaN(num) || num < 0) { showError('Nilai target tidak valid.'); return; }
    setSaving(true); setSaveError(null);
    try {
      // ─────────────────────────────────────────────────────────────────
      // Menggunakan Server Action, bukan menembak DB langsung dari Klien
      // ─────────────────────────────────────────────────────────────────
      await saveCustomerTargetAction(custId, initialMonth, initialYear, num);
      showSuccess('Target klien berhasil disimpan ✓');
    } catch (err: any) { 
      showError(`Error: ${err?.message}`); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* ── TOPBAR ── */}
      <div className="bg-slate-900 px-8 flex items-center justify-between h-16 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
          <span className="text-sm font-bold text-slate-100 uppercase tracking-wider">KPI & Target Analysis</span>
          {saving 
            ? <span className="ml-5 flex items-center gap-1.5 bg-blue-700 text-blue-100 text-[11px] font-bold px-3 py-1 rounded tracking-wide"><IconSave /> Menyimpan perubahan...</span>
            : <span className="ml-5 text-[11px] text-slate-400 font-medium">Reporting Period: {monthNames[initialMonth - 1]} {initialYear}</span>
          }
        </div>
        <div className="flex items-center gap-2">
          <select value={initialMonth} onChange={e => handleFilterChange(Number(e.target.value), initialYear)} className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-[13px] font-semibold outline-none cursor-pointer hover:bg-slate-700 transition-colors">
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthNames[i]}</option>)}
          </select>
          <input type="number" value={initialYear} onChange={e => handleFilterChange(initialMonth, Number(e.target.value))} className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-[13px] font-semibold outline-none w-20 text-center hover:bg-slate-700 transition-colors" />
        </div>
      </div>

      <div className="p-8 max-w-[1280px] mx-auto space-y-5">
        
        {/* ── BANNERS ── */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <div className="text-xs font-bold text-red-800 mb-0.5">Gagal Menyimpan</div>
              <div className="text-xs text-red-700">{saveError}</div>
              <div className="text-[11px] text-red-500 mt-1">Kemungkinan RLS belum diizinkan atau kesalahan server.</div>
            </div>
          </div>
        )}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2 text-[13px] font-semibold text-emerald-800">
            ✅ {saveSuccess}
          </div>
        )}

        {/* ── HERO KPI ROW ── */}
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Performance Overview</p>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-[1fr_1fr_1fr_1.8fr] gap-4">
            
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Company Target</p>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">{fmtRp(initialCompanyTarget)}</p>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Target ditetapkan untuk periode ini</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 border-t-4 border-t-blue-500">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Actual Revenue</p>
              <p className="text-2xl font-extrabold text-blue-700 leading-none">{fmtRp(companyActual)}</p>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                {gap > 0 ? `Gap: ${fmtRp(gap)} belum terpenuhi` : <span className="text-emerald-500 font-bold">Target terlampaui ✓</span>}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Client Status</p>
              <div className="flex gap-3 mt-1">
                <div className="text-center">
                  <div className="text-xl font-extrabold text-emerald-500">{achieved}</div>
                  <div className="text-[9px] text-slate-400 font-bold tracking-wider">ACHIEVED</div>
                </div>
                <div className="w-px bg-slate-100" />
                <div className="text-center">
                  <div className="text-xl font-extrabold text-amber-500">{onTrack}</div>
                  <div className="text-[9px] text-slate-400 font-bold tracking-wider">ON TRACK</div>
                </div>
                <div className="w-px bg-slate-100" />
                <div className="text-center">
                  <div className="text-xl font-extrabold text-red-500">{lagging}</div>
                  <div className="text-[9px] text-slate-400 font-bold tracking-wider">LAGGING</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Overall Achievement</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[40px] font-black text-slate-50 leading-none tracking-tight">{compPercent.toFixed(1)}%</span>
                  <StatusBadge pct={compPercent} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1.5">
                  <span>{fmtRp(companyActual)} realized</span>
                  <span>Target: {fmtRp(initialCompanyTarget)}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${compPercent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`} style={{ width: `${Math.min(compPercent, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TARGET SETTING ROW ── */}
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Target Configuration</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Set Company Target — {monthNames[initialMonth - 1]} {initialYear}</p>
              <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-1.5 focus-within:border-blue-500 transition-colors">
                <span className="text-[13px] font-bold text-slate-400">IDR</span>
                <input type="number" value={compInputVal} onChange={e => setCompInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveCompTarget(compInputVal); } }} placeholder="0" className="text-[22px] font-extrabold text-slate-900 bg-transparent border-none outline-none w-full" />
                <button onClick={() => saveCompTarget(compInputVal)} disabled={saving || !compInputVal} className={`rounded-md px-3.5 py-1.5 text-xs font-bold shrink-0 transition-colors ${saving || !compInputVal ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>{saving ? '...' : 'Simpan'}</button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Tekan Enter atau klik Simpan untuk menyimpan</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">Catatan Periode</p>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Anda sedang mengatur target untuk bulan <strong className="text-slate-900">{monthNames[initialMonth - 1]} {initialYear}</strong>. Perubahan target akan langsung tercermin pada semua panel di halaman ini. Target per-klien dapat diatur pada kolom tabel di bawah.
              </p>
            </div>
          </div>
        </div>

        {/* ── CUSTOMER TABLE ── */}
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Client Performance Detail</p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            
            <div className="grid grid-cols-[36px_1fr_220px_160px_200px_90px] bg-slate-50 border-b border-slate-200 px-2">
              <div className="p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest" />
              <div className="p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Client</div>
              <div className="p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Target (IDR)</div>
              <div className="p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Actual Revenue</div>
              <div className="p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Achievement</div>
              <div className="p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Status</div>
            </div>

            {customerData.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-[13px]">Tidak ada data klien untuk periode ini.</div>
            ) : (
              customerData.map((item, idx) => {
                const isExpanded = expandedCustId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <div 
                      onClick={() => handleExpandRow(item)} 
                      className={`grid grid-cols-[36px_1fr_220px_160px_200px_90px] px-2 items-center cursor-pointer border-b border-slate-100 transition-colors ${isExpanded ? 'bg-blue-50/50' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}`}
                    >
                      <div className="p-3 text-slate-400 flex items-center justify-center"><IconChevron down={isExpanded} /></div>
                      <div className="p-3 text-[13px] font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="p-3" onClick={e => e.stopPropagation()}>
                        <CustTargetInput item={item} month={initialMonth} year={initialYear} saving={saving} onSave={saveCustTarget} />
                      </div>
                      <div className="p-3 text-[13px] font-bold text-slate-800 text-right tabular-nums">{fmtRp(item.actual)}</div>
                      <div className="p-3 pr-4"><ProgressBar pct={item.percent} /></div>
                      <div className="p-3 text-center"><StatusBadge pct={item.percent} /></div>
                    </div>

                    {/* DRILL DOWN (Historical Chart) */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
                        <div className="flex flex-col md:flex-row gap-10 items-start">
                          <div className="min-w-[220px]">
                            <div className="flex items-center gap-1.5 mb-1"><IconTrend /><span className="text-xs font-extrabold text-slate-900">Revenue Trend</span></div>
                            <p className="text-[11px] text-slate-500 font-medium mb-4">{item.name}</p>
                            <div className="flex flex-col gap-2">
                              <div className="bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Period Actual</div>
                                <div className="text-base font-extrabold text-blue-700">{fmtFull(item.actual)}</div>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Achievement</div>
                                <div className={`text-base font-extrabold ${item.percent >= 100 ? 'text-emerald-500' : 'text-slate-900'}`}>{item.percent.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 w-full">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">6-Month Historical Revenue</p>
                            {historyLoading ? (
                              <div className="text-center text-slate-400 text-xs font-semibold py-5">Memuat riwayat transaksi...</div>
                            ) : (
                              <div className="flex items-end gap-2.5 h-[110px] border-b border-slate-200 pb-0">
                                {historyData.map((h, i) => {
                                  const heightPct = maxHistory > 0 ? (h.value / maxHistory) * 100 : 0;
                                  const isLast = i === historyData.length - 1;
                                  return (
                                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0 relative group">
                                      {h.value > 0 && <div className="text-[9px] font-bold text-slate-400 mb-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4">{fmtRp(h.value)}</div>}
                                      <div className={`w-full rounded-t-sm transition-all duration-700 ease-out ${isLast ? 'bg-blue-700' : 'bg-blue-200 group-hover:bg-blue-300'}`} style={{ height: `${heightPct}%`, minHeight: h.value > 0 ? '4px' : '0px' }} />
                                      <div className={`text-[10px] font-bold mt-1 tracking-wide ${isLast ? 'text-blue-700' : 'text-slate-400'}`}>{h.label}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center pb-8">
          <span className="text-[11px] text-slate-400 font-medium">KPI & Target Analysis — {monthNames[initialMonth - 1]} {initialYear}</span>
          <span className="text-[11px] text-slate-400 font-medium">{customerData.length} clients tracked</span>
        </div>

      </div>
    </div>
  );
}