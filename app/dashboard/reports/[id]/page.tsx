'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtRp = (num: number) =>
  `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const getStatusStyle = (status: string): React.CSSProperties => {
  const s = (status || '').toLowerCase();
  if (s.includes('paid') || s.includes('completed'))
    return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
  if (s.includes('partial'))
    return { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };
  if (s.includes('unpaid') || s.includes('pending') || s.includes('open') || s.includes('uninvoiced'))
    return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
  return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const Badge = ({ label }: { label: string }) => (
  <span style={{
    ...getStatusStyle(label),
    fontSize: 10, fontWeight: 800, padding: '3px 10px',
    borderRadius: 4, letterSpacing: '0.07em', textTransform: 'uppercase',
  }}>{label || '—'}</span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: '#94a3b8',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
    paddingBottom: 8, borderBottom: '1px solid #f1f5f9',
  }}>{children}</div>
);

const DataRow = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 800, color: highlight ? '#0f172a' : '#334155' }}>{value}</span>
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MasterReportDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [soRes, itemsRes, doRes, invRes] = await Promise.all([
        supabase
          .from('sales_orders')
          .select(`id, so_number, po_number, created_at, grand_total, customer_id, address_id,
                  customers(company_name), quotations(quotation_number)`)
          .eq('id', id)
          .single(),
        supabase
          .from('sales_order_items')
          .select('qty, unit_price, discount, total_price, products(part_code, part_name, unit)')
          .eq('so_id', id),
        supabase
          .from('delivery_orders')
          .select('do_number, delivery_date, status')
          .eq('so_id', id),
        supabase
          .from('invoices')
          .select('id, invoice_number, due_date, status, grand_total, amount_paid')
          .eq('so_id', id),
      ]);

      const soData = soRes.data;
      const custId = soData?.customer_id;
      const invId  = invRes.data?.[invRes.data.length - 1]?.id;

      // Batch 2 — butuh hasil dari batch 1
      const [addrRes, payRes] = await Promise.all([
        custId
          ? supabase.from('customer_addresses').select('*').eq('customer_id', custId)
          : Promise.resolve({ data: [] }),
        invId
          ? supabase.from('payments').select('payment_date, amount_paid, payment_method').eq('invoice_id', invId)
          : Promise.resolve({ data: [] }),
      ]);
    } catch (e) {
      console.error("Fetch Detail Error:", e);
      alert('Data laporan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Memuat data transaksi...</p>
    </div>
  );

  // ── COMPUTED VALUES ──────────────────────────────────────────────────────────
  const isPaid = (data.payment_status || '').toLowerCase() === 'paid';
  const invoiceTotal = Number(data.invoice?.grand_total || 0);
  const totalPaid = Number(data.total_paid_amount || 0);
  // If status is Paid → sisa piutang is always 0, regardless of arithmetic
  const sisaPiutang = isPaid ? 0 : Math.max(0, invoiceTotal - totalPaid);

  const S: Record<string, React.CSSProperties> = {
    page: {
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      background: '#f0f4f8',
      minHeight: '100vh',
      color: '#1e293b',
    },
    // Topbar
    topbar: {
      background: '#0f172a',
      padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 64, borderBottom: '1px solid #1e293b',
    },
    topbarLeft: { display: 'flex', alignItems: 'center', gap: 16 },
    backBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 36, borderRadius: 8,
      background: '#1e293b', border: '1px solid #334155',
      color: '#94a3b8', cursor: 'pointer', textDecoration: 'none',
      transition: 'background 0.15s',
    },
    topbarTitle: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.05em', textTransform: 'uppercase' as const },
    topbarSub: { fontSize: 11, color: '#475569', fontWeight: 500 },
    printBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'transparent', border: '1px solid #334155',
      color: '#94a3b8', padding: '7px 16px', borderRadius: 6,
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      letterSpacing: '0.04em',
    },
    body: { padding: '28px 32px', maxWidth: 1280, margin: '0 auto' },
    // Document header band
    docHeader: {
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: 10, padding: '24px 28px', marginBottom: 20,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 24,
    },
    soNum: { fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#1d4ed8', letterSpacing: '-0.01em' },
    custName: { fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
    // Cards
    card: {
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: 10, overflow: 'hidden', marginBottom: 20,
    },
    cardHeader: {
      padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#fafbfc',
    },
    cardTitle: { fontSize: 12, fontWeight: 800, color: '#0f172a', letterSpacing: '0.03em' },
    cardBody: { padding: '0 20px' },
    // Table
    th: { fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '10px 16px', textAlign: 'left' as const },
    td: { padding: '14px 16px', fontSize: 13 },
    // Finance box
    finBox: {
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 8, padding: '14px 16px', marginTop: 8,
    },
    finLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const },
    finValue: { fontSize: 20, fontWeight: 900, color: '#0f172a', marginTop: 2 },
    // Remaining
    sisaBox: {
      background: isPaid ? '#f0fdf4' : '#fff7ed',
      border: `1px solid ${isPaid ? '#bbf7d0' : '#fed7aa'}`,
      borderRadius: 8, padding: '14px 18px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    sisaLabel: { fontSize: 11, fontWeight: 800, color: isPaid ? '#166534' : '#9a3412', letterSpacing: '0.07em', textTransform: 'uppercase' as const },
    sisaValue: { fontSize: 22, fontWeight: 900, color: isPaid ? '#16a34a' : '#ea580c' },
  };

  return (
    <div style={S.page}>
      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 16mm; size: A4; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={S.topbar} className="no-print">
        <div style={S.topbarLeft}>
          <Link href="/dashboard/reports" style={S.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <div style={S.topbarTitle}>Transaction Detail</div>
            <div style={S.topbarSub}>Master 360° Report — {data.so_number}</div>
          </div>
        </div>
        <button onClick={() => window.print()} style={S.printBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Cetak Laporan
        </button>
      </div>

      <div style={S.body}>

        {/* ── DOCUMENT HEADER ── */}
        <div style={S.docHeader}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Sales Order
            </div>
            <div style={S.soNum}>{data.so_number}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
              PO: <span style={{ color: '#0f172a', fontWeight: 700 }}>{data.po_number || 'Tidak Ada PO'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Customer</div>
            <div style={S.custName}>{data.company_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Tgl Order: <span style={{ color: '#0f172a', fontWeight: 700 }}>{fmtDate(data.so_date)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Status Pembayaran</div>
            <div style={{ marginBottom: 8 }}><Badge label={data.payment_status || 'Uninvoiced'} /></div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Status Pengiriman</div>
            <Badge label={data.delivery_status || 'Open'} />
          </div>
        </div>

        {/* ── ADDRESS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            { title: 'Alamat Penagihan (Billing)', addr: data.billingAddress },
            { title: 'Alamat Pengiriman (Shipping)', addr: data.shippingAddress || data.billingAddress },
          ].map(({ title, addr }) => (
            <div key={title} style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>{title}</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <p style={{ fontSize: 13, color: '#334155', fontWeight: 600, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {addr?.complete_address || '—'}
                </p>
                {addr?.pic_name && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>
                    <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attn: </span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{addr.pic_name}</span>
                    {addr.pic_phone && <span style={{ color: '#94a3b8' }}> · {addr.pic_phone}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div>
            {/* Items Table */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Daftar Barang Dipesan</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{data.items.length} item</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={S.th}>Part Number</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Qty</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={S.td}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: 13 }}>{it.products?.part_code}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{it.products?.part_name}</div>
                      </td>
                      <td style={{ ...S.td, textAlign: 'center', fontWeight: 800, color: '#334155' }}>
                        {it.qty} <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{it.products?.unit}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right', color: '#475569', fontWeight: 600 }}>{fmtRp(it.unit_price)}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{fmtRp(it.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={3} style={{ ...S.td, fontWeight: 800, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grand Total</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#0f172a' }}>
                      {fmtRp(data.total_order_value)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Delivery Orders */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Logistik & Pengiriman (DO)</span>
                <Badge label={data.delivery_status || 'Open'} />
              </div>
              <div style={{ padding: '16px 20px' }}>
                {data.deliveryOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                    Belum ada Surat Jalan (DO) yang diterbitkan
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.deliveryOrders.map((doItem: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0d9488', fontSize: 14 }}>{doItem.do_number}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                            Dikirim: {fmtDate(doItem.delivery_date)}
                          </div>
                        </div>
                        <Badge label="Terkirim" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Invoice & Finance */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Keuangan (Invoice)</span>
                <Badge label={data.payment_status || 'Uninvoiced'} />
              </div>
              <div style={{ padding: '16px 20px' }}>
                {!data.invoice ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                    Invoice belum diterbitkan
                  </div>
                ) : (
                  <>
                    {/* Invoice number */}
                    <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Nomor Invoice</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#1d4ed8', fontSize: 16 }}>{data.invoice.invoice_number}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                        Jatuh Tempo: {fmtDate(data.invoice.due_date)}
                      </div>
                    </div>

                    {/* Finance rows */}
                    <DataRow label="Total Tagihan" value={fmtRp(invoiceTotal)} highlight />
                    <DataRow label="Telah Dibayar" value={<span style={{ color: '#16a34a' }}>{fmtRp(totalPaid)}</span>} />

                    {/* Sisa Piutang */}
                    <div style={{ ...S.sisaBox, marginTop: 16 }}>
                      <div>
                        <div style={S.sisaLabel}>Sisa Piutang</div>
                        {isPaid && (
                          <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Lunas ✓</div>
                        )}
                      </div>
                      <div style={S.sisaValue}>{fmtRp(sisaPiutang)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment History */}
            {data.payments?.length > 0 && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <span style={S.cardTitle}>Riwayat Pembayaran</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{data.payments.length} transaksi</span>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.payments.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{fmtDate(p.payment_date)}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                          {p.payment_method || '—'}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#16a34a' }}>
                        +{fmtRp(p.amount_paid)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotation ref */}
            {data.quotation_number && (
              <div style={{ ...S.card, marginBottom: 0 }}>
                <div style={S.cardHeader}>
                  <span style={S.cardTitle}>Referensi Quotation</span>
                </div>
                <div style={{ padding: '14px 20px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#7c3aed', fontSize: 14 }}>
                    {data.quotation_number}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', fontWeight: 500 }} className="no-print">
          <span>Transaction Detail — {data.so_number}</span>
          <span>Dicetak: {fmtDate(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
}