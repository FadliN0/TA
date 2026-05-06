'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconTarget = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconChevron = ({ down }: { down: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: down ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconTrend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmtRp = (num: number) => {
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${Number(num).toLocaleString('id-ID')}`;
};
const fmtFull = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ pct }: { pct: number }) => {
  if (pct >= 100) return <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>ACHIEVED</span>;
  if (pct >= 75) return <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>ON TRACK</span>;
  return <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>LAGGING</span>;
};

// ─── INLINE PROGRESS BAR ──────────────────────────────────────────────────────
const ProgressBar = ({ pct }: { pct: number }) => {
  const clipped = Math.min(pct, 100);
  const color = pct >= 100 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#3b82f6';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clipped}%`, background: color, borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ minWidth: 38, textAlign: 'right', fontSize: 12, fontWeight: 700, color: color, fontVariantNumeric: 'tabular-nums' }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
};

// ─── CUSTOMER TARGET INPUT (controlled, per row) ─────────────────────────────
function CustTargetInput({ item, month, year, saving, onSave }: {
  item: any; month: number; year: number; saving: boolean;
  onSave: (id: string, tid: string | undefined, val: string) => void;
}) {
  const [val, setVal] = React.useState(item.target > 0 ? String(item.target) : '');
  const [dirty, setDirty] = React.useState(false);

  // Sync when item.target changes externally (after fetch)
  React.useEffect(() => {
    setVal(item.target > 0 ? String(item.target) : '');
    setDirty(false);
  }, [item.target, month, year]);

  const handleSave = () => {
    if (!val.trim() || !dirty) return;
    onSave(item.id, item.target_id, val);
    setDirty(false);
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input
        type="number"
        value={val}
        onChange={e => { setVal(e.target.value); setDirty(true); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
        placeholder="—"
        style={{
          flex: 1, textAlign: 'center', minWidth: 0,
          fontSize: 13, fontWeight: 700, color: '#1d4ed8',
          background: dirty ? '#eff6ff' : '#f8fafc',
          border: dirty ? '1px solid #93c5fd' : '1px solid #e2e8f0',
          borderRadius: 6, padding: '6px 8px', outline: 'none',
          fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s',
        }}
      />
      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#1d4ed8', color: '#fff', border: 'none',
            borderRadius: 5, padding: '6px 10px', fontSize: 11,
            fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >✓</button>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TargetManagementPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [companyTarget, setCompanyTarget] = useState(0);
  const [companyActual, setCompanyActual] = useState(0);
  const [customerData, setCustomerData] = useState<any[]>([]);

  // Local editable value for company target input
  const [compInputVal, setCompInputVal] = useState('');

  const [expandedCustId, setExpandedCustId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

  const showSuccess = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3000);
  };
  const showError = (msg: string) => {
    setSaveError(msg);
    setTimeout(() => setSaveError(null), 6000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: compTarget, error: e1 } = await supabase
        .from('company_targets').select('*').eq('month', month).eq('year', year).maybeSingle();
      if (e1) { showError(`Fetch company_targets: ${e1.message}`); }
      const newTarget = Number(compTarget?.target_amount || 0);
      setCompanyTarget(newTarget);
      setCompInputVal(newTarget > 0 ? String(newTarget) : '');

      const { data: allSales, error: e2 } = await supabase
        .from('v_transaction_lifecycle')
        .select('customer_id, invoice_date, payment_status, total_order_value');
      if (e2) { showError(`Fetch sales: ${e2.message}`); }

      const filteredSales = allSales?.filter(trx => {
        if (trx.payment_status === 'Uninvoiced') return false; // belum ditagih, skip
        if (!trx.invoice_date) return false;
        const d = new Date(trx.invoice_date);
        return (d.getMonth() + 1) === month && d.getFullYear() === year;
      }) || [];
      setCompanyActual(filteredSales.reduce((sum, item) => sum + Number(item.total_order_value), 0));

      const { data: custTargets } = await supabase
        .from('customer_targets').select('*').eq('month', month).eq('year', year);
      const { data: customers } = await supabase
        .from('customers').select('id, company_name').order('company_name');

      const report = customers?.map(cust => {
        const ct = custTargets?.find(t => t.customer_id === cust.id);
        const targetAmount = Number(ct?.target_amount || 0);
        const actual = filteredSales
          .filter(s => s.customer_id === cust.id)
          .reduce((sum, item) => sum + Number(item.total_order_value), 0);
        return {
          id: cust.id, name: cust.company_name,
          target: targetAmount,
          target_id: ct?.id,
          actual,
          percent: targetAmount > 0 ? (actual / targetAmount) * 100 : 0,
        };
      }) || [];
      setCustomerData(report);
    } finally { setLoading(false); }
  };

  const handleExpandRow = async (cust: any) => {
    if (expandedCustId === cust.id) { setExpandedCustId(null); return; }
    setExpandedCustId(cust.id);
    setHistoryLoading(true);
    try {
      const { data } = await supabase.from('v_transaction_lifecycle')
        .select('invoice_date, payment_status, total_order_value')
        .eq('customer_id', cust.id)
        .order('invoice_date', { ascending: false });

      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1, 1);
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

  useEffect(() => { fetchAllData(); }, [month, year]);

  // ── SAVE COMPANY TARGET ──────────────────────────────────────────────────────
  const saveCompTarget = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const num = Number(trimmed);
    if (isNaN(num) || num < 0) { showError('Nilai target tidak valid.'); return; }

    // Optimistic update: update UI immediately
    setCompanyTarget(num);
    setSaving(true);
    setSaveError(null);

    try {
      // Try upsert first
      const { error: upsertErr } = await supabase
        .from('company_targets')
        .upsert({ month, year, target_amount: num }, { onConflict: 'month,year' });

      if (upsertErr) {
        // Fallback: try delete then insert
        await supabase.from('company_targets').delete().eq('month', month).eq('year', year);
        const { error: insertErr } = await supabase
          .from('company_targets')
          .insert({ month, year, target_amount: num });

        if (insertErr) {
          showError(`Gagal simpan: ${insertErr.message}. Cek RLS policy di Supabase.`);
          await fetchAllData(); // revert optimistic update
          setSaving(false);
          return;
        }
      }

      showSuccess('Company target berhasil disimpan ✓');
      // Refresh to confirm from DB
      await fetchAllData();
    } catch (err: any) {
      showError(`Error: ${err?.message || 'Unknown error'}`);
      await fetchAllData();
    } finally {
      setSaving(false);
    }
  };

  // ── SAVE CUSTOMER TARGET ─────────────────────────────────────────────────────
  const saveCustTarget = async (custId: string, targetId: string | undefined, val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const num = Number(trimmed);
    if (isNaN(num) || num < 0) { showError('Nilai target tidak valid.'); return; }

    // Optimistic update
    setCustomerData(prev => prev.map(c => {
      if (c.id !== custId) return c;
      const pct = num > 0 ? (c.actual / num) * 100 : 0;
      return { ...c, target: num, percent: pct };
    }));

    setSaving(true);
    setSaveError(null);

    try {
      const { error: upsertErr } = await supabase
        .from('customer_targets')
        .upsert({ customer_id: custId, month, year, target_amount: num }, { onConflict: 'customer_id,month,year' });

      if (upsertErr) {
        // Fallback: delete then insert
        await supabase.from('customer_targets')
          .delete().eq('customer_id', custId).eq('month', month).eq('year', year);
        const { error: insertErr } = await supabase
          .from('customer_targets')
          .insert({ customer_id: custId, month, year, target_amount: num });

        if (insertErr) {
          showError(`Gagal simpan: ${insertErr.message}. Cek RLS policy di Supabase.`);
          await fetchAllData();
          setSaving(false);
          return;
        }
      }

      showSuccess('Target klien berhasil disimpan ✓');
      await fetchAllData();
    } catch (err: any) {
      showError(`Error: ${err?.message || 'Unknown error'}`);
      await fetchAllData();
    } finally {
      setSaving(false);
    }
  };

  const compPercent = companyTarget > 0 ? (companyActual / companyTarget) * 100 : 0;
  const maxHistory = Math.max(...historyData.map(h => h.value), 1);
  const gap = companyTarget - companyActual;

  // ── Derived KPI cards ──
  const achieved = customerData.filter(c => c.percent >= 100).length;
  const onTrack = customerData.filter(c => c.percent >= 75 && c.percent < 100).length;
  const lagging = customerData.filter(c => c.percent < 75).length;

  // ── Styles ──
  const S: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      background: '#f0f4f8',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      color: '#1e293b',
    },
    topbar: {
      background: '#0f172a',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      borderBottom: '1px solid #1e293b',
    },
    topbarBrand: {
      display: 'flex', alignItems: 'center', gap: 12,
    },
    topbarDot: {
      width: 8, height: 8, borderRadius: '50%',
      background: '#3b82f6', boxShadow: '0 0 8px #3b82f6',
    },
    topbarTitle: {
      fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    },
    topbarSub: {
      fontSize: 11, color: '#475569', fontWeight: 500, marginLeft: 20,
    },
    periodWrap: {
      display: 'flex', alignItems: 'center', gap: 8,
    },
    select: {
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#e2e8f0',
      padding: '6px 12px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 600,
      outline: 'none',
      cursor: 'pointer',
    },
    yearInput: {
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#e2e8f0',
      padding: '6px 12px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 600,
      outline: 'none',
      width: 80,
      textAlign: 'center' as const,
    },
    savingBadge: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#1d4ed8', color: '#bfdbfe',
      fontSize: 11, fontWeight: 700, padding: '4px 12px',
      borderRadius: 4, letterSpacing: '0.05em',
    },
    body: { padding: '28px 32px', maxWidth: 1280, margin: '0 auto' },
    sectionLabel: {
      fontSize: 10, fontWeight: 800, color: '#94a3b8',
      letterSpacing: '0.1em', textTransform: 'uppercase' as const,
      marginBottom: 14,
    },

    // Hero row
    heroRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.8fr', gap: 16, marginBottom: 20 },
    kpiCard: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '20px 22px',
    },
    kpiLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 },
    kpiValue: { fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
    kpiSub: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: 500 },

    // Main progress card
    progressCard: {
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 10,
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
    },
    progressPct: { fontSize: 42, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, letterSpacing: '-0.02em' },
    progressTitle: { fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginTop: 4 },
    bigBar: { height: 8, background: '#1e293b', borderRadius: 999, overflow: 'hidden', marginTop: 16 },

    // Target setting row
    settingRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
    settingCard: {
      background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 22px',
    },
    inputWrap: {
      display: 'flex', alignItems: 'center',
      borderBottom: '2px solid #e2e8f0',
      paddingBottom: 6,
      gap: 6,
    },
    currencyPrefix: { fontSize: 13, fontWeight: 700, color: '#94a3b8' },
    bigInput: {
      fontSize: 22, fontWeight: 800, color: '#0f172a',
      background: 'transparent', border: 'none', outline: 'none',
      width: '100%',
      fontFamily: 'inherit',
    },
    inputHint: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: 500 },

    // Table
    tableWrap: {
      background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
    },
    tableHead: {
      display: 'grid',
      gridTemplateColumns: '36px 1fr 220px 160px 200px 90px',
      background: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 8px',
    },
    th: { fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '11px 12px' },
    tableRow: {
      display: 'grid',
      gridTemplateColumns: '36px 1fr 220px 160px 200px 90px',
      padding: '0 8px',
      borderBottom: '1px solid #f1f5f9',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
    td: { padding: '14px 12px', fontSize: 13 },
    custName: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
    actualVal: { fontSize: 13, fontWeight: 700, color: '#1e293b', textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' },

    // Drill down
    drillWrap: {
      background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
      padding: '24px 32px',
    },
    drillHeader: { fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
    drillSub: { fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 20 },
    chartWrap: {
      display: 'flex', alignItems: 'flex-end', gap: 12,
      height: 100, paddingTop: 16,
      borderBottom: '1px solid #e2e8f0',
      borderLeft: '1px solid #e2e8f0',
      paddingLeft: 8,
    },
    chartBarWrap: {
      flex: 1, display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'flex-end',
      gap: 4, height: '100%', position: 'relative' as const,
    },
  };

  return (
    <div style={S.page}>
      {/* ── TOPBAR ── */}
      <div style={S.topbar}>
        <div style={S.topbarBrand}>
          <div style={S.topbarDot} />
          <span style={S.topbarTitle}>KPI & Target Analysis</span>
          {saving
            ? <span style={S.savingBadge}><IconSave /> Menyimpan perubahan...</span>
            : <span style={S.topbarSub}>Reporting Period: {monthNames[month - 1]} {year}</span>
          }
        </div>
        <div style={S.periodWrap}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={S.select}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{monthNames[i]}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={S.yearInput} />
        </div>
      </div>

      <div style={S.body}>

      {/* ── ERROR / SUCCESS BANNER ── */}
      {saveError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 2 }}>Gagal Menyimpan</div>
            <div style={{ fontSize: 12, color: '#b91c1c' }}>{saveError}</div>
            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
              Kemungkinan penyebab: RLS (Row Level Security) belum diizinkan untuk INSERT/UPDATE di tabel <code>company_targets</code> atau <code>customer_targets</code>.
              Buka Supabase → Table Editor → Authentication → Policies, lalu tambahkan policy untuk operasi tersebut.
            </div>
          </div>
        </div>
      )}
      {saveSuccess && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 600, color: '#166534',
        }}>
          ✅ {saveSuccess}
        </div>
      )}

        {/* ── HERO KPI ROW ── */}
        <div style={{ marginBottom: 8 }}>
          <p style={S.sectionLabel}>Performance Overview</p>
        </div>
        <div style={S.heroRow}>

          {/* Card 1: Target */}
          <div style={S.kpiCard}>
            <p style={S.kpiLabel}>Company Target</p>
            <p style={S.kpiValue}>{fmtRp(companyTarget)}</p>
            <p style={S.kpiSub}>Target ditetapkan untuk periode ini</p>
          </div>

          {/* Card 2: Actual */}
          <div style={{ ...S.kpiCard, borderTop: '3px solid #3b82f6' }}>
            <p style={S.kpiLabel}>Actual Revenue</p>
            <p style={{ ...S.kpiValue, color: '#1d4ed8' }}>{fmtRp(companyActual)}</p>
            <p style={S.kpiSub}>
              {gap > 0
                ? `Gap: ${fmtRp(gap)} belum terpenuhi`
                : <span style={{ color: '#10b981', fontWeight: 700 }}>Target terlampaui ✓</span>
              }
            </p>
          </div>

          {/* Card 3: Client status */}
          <div style={S.kpiCard}>
            <p style={S.kpiLabel}>Client Status</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{achieved}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>ACHIEVED</div>
              </div>
              <div style={{ width: 1, background: '#f1f5f9' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{onTrack}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>ON TRACK</div>
              </div>
              <div style={{ width: 1, background: '#f1f5f9' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{lagging}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>LAGGING</div>
              </div>
            </div>
          </div>

          {/* Card 4: Big Achievement */}
          <div style={S.progressCard}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Overall Achievement
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={S.progressPct}>{compPercent.toFixed(1)}%</span>
                <StatusBadge pct={compPercent} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 6 }}>
                <span>{fmtRp(companyActual)} realized</span>
                <span>Target: {fmtRp(companyTarget)}</span>
              </div>
              <div style={S.bigBar}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(compPercent, 100)}%`,
                  background: compPercent >= 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  borderRadius: 999,
                  transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── TARGET SETTING ROW ── */}
        <p style={S.sectionLabel}>Target Configuration</p>
        <div style={S.settingRow}>
          <div style={S.settingCard}>
            <p style={{ ...S.kpiLabel, marginBottom: 12 }}>Set Company Target — {monthNames[month - 1]} {year}</p>
            <div style={{ ...S.inputWrap, alignItems: 'center', gap: 8 }}>
              <span style={S.currencyPrefix}>IDR</span>
              <input
                type="number"
                value={compInputVal}
                onChange={e => setCompInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveCompTarget(compInputVal); } }}
                placeholder="0"
                style={{ ...S.bigInput, flex: 1 }}
              />
              <button
                onClick={() => saveCompTarget(compInputVal)}
                disabled={saving || !compInputVal}
                style={{
                  background: saving ? '#93c5fd' : '#1d4ed8',
                  color: '#ffffff', border: 'none', borderRadius: 6,
                  padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  cursor: saving || !compInputVal ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                {saving ? '...' : 'Simpan'}
              </button>
            </div>
            <p style={S.inputHint}>Tekan Enter atau klik Simpan untuk menyimpan</p>
          </div>
          <div style={{ ...S.settingCard, background: '#f8fafc' }}>
            <p style={{ ...S.kpiLabel, marginBottom: 10 }}>Catatan Periode</p>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
              Anda sedang mengatur target untuk bulan <strong style={{ color: '#0f172a' }}>{monthNames[month - 1]} {year}</strong>.
              Perubahan target akan langsung tercermin pada semua panel di halaman ini.
              Target per-klien dapat diatur langsung pada kolom tabel di bawah.
            </p>
          </div>
        </div>

        {/* ── CUSTOMER TABLE ── */}
        <p style={S.sectionLabel}>Client Performance Detail</p>
        <div style={S.tableWrap}>
          {/* Table Head */}
          <div style={S.tableHead}>
            <div style={S.th} />
            <div style={S.th}>Client</div>
            <div style={{ ...S.th, textAlign: 'center' }}>Target (IDR)</div>
            <div style={{ ...S.th, textAlign: 'right' }}>Actual Revenue</div>
            <div style={S.th}>Achievement</div>
            <div style={S.th}>Status</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
              Memuat data...
            </div>
          ) : customerData.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Tidak ada data klien untuk periode ini.
            </div>
          ) : (
            customerData.map((item, idx) => {
              const isExpanded = expandedCustId === item.id;
              return (
                <React.Fragment key={item.id}>
                  <div
                    style={{
                      ...S.tableRow,
                      background: isExpanded ? '#f0f7ff' : idx % 2 === 0 ? '#ffffff' : '#fafbfc',
                    }}
                    onClick={() => handleExpandRow(item)}
                    onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? '#ffffff' : '#fafbfc'; }}
                  >
                    {/* Chevron */}
                    <div style={{ ...S.td, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconChevron down={isExpanded} />
                    </div>

                    {/* Name */}
                    <div style={S.td}>
                      <span style={S.custName}>{item.name}</span>
                    </div>

                    {/* Target input */}
                    <div style={S.td} onClick={e => e.stopPropagation()}>
                      <CustTargetInput
                        item={item}
                        month={month}
                        year={year}
                        saving={saving}
                        onSave={saveCustTarget}
                      />
                    </div>

                    {/* Actual */}
                    <div style={{ ...S.td, ...S.actualVal }}>
                      {fmtRp(item.actual)}
                    </div>

                    {/* Progress */}
                    <div style={{ ...S.td, paddingRight: 16 }}>
                      <ProgressBar pct={item.percent} />
                    </div>

                    {/* Status badge */}
                    <div style={{ ...S.td, textAlign: 'center' }}>
                      <StatusBadge pct={item.percent} />
                    </div>
                  </div>

                  {/* ── DRILL DOWN ── */}
                  {isExpanded && (
                    <div style={S.drillWrap}>
                      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
                        {/* Left: info */}
                        <div style={{ minWidth: 220 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <IconTrend />
                            <span style={S.drillHeader}>Revenue Trend</span>
                          </div>
                          <p style={S.drillSub}>{item.name}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Period Actual</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>{fmtFull(item.actual)}</div>
                            </div>
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Achievement</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: item.percent >= 100 ? '#10b981' : '#0f172a' }}>{item.percent.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Right: bar chart */}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                            6-Month Historical Revenue
                          </p>
                          {historyLoading ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600, padding: '20px 0' }}>
                              Memuat riwayat transaksi...
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
                              {historyData.map((h, i) => {
                                const heightPct = maxHistory > 0 ? (h.value / maxHistory) * 100 : 0;
                                const isLast = i === historyData.length - 1;
                                return (
                                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 0, position: 'relative' }}>
                                    {/* value label on top of bar */}
                                    {h.value > 0 && (
                                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 3, whiteSpace: 'nowrap' }}>
                                        {fmtRp(h.value)}
                                      </div>
                                    )}
                                    <div style={{
                                      width: '100%',
                                      height: `${heightPct}%`,
                                      minHeight: h.value > 0 ? 4 : 0,
                                      background: isLast ? '#1d4ed8' : '#bfdbfe',
                                      borderRadius: '3px 3px 0 0',
                                      transition: 'height 0.7s cubic-bezier(0.4,0,0.2,1)',
                                    }} />
                                    <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? '#1d4ed8' : '#94a3b8', marginTop: 4, letterSpacing: '0.04em' }}>
                                      {h.label}
                                    </div>
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

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>
            KPI & Target Analysis — {monthNames[month - 1]} {year}
          </span>
          <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>
            {customerData.length} clients tracked
          </span>
        </div>
      </div>
    </div>
  );
}