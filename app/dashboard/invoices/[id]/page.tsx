'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; 
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const { id } = useParams();

  // ─── Role: dibaca persis sama seperti di dashboard/layout.tsx ────
  const supabaseClient = createClientComponentClient();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profileData?.role) setUserRole(profileData.role.toLowerCase());
    };
    fetchRole();
  }, []);

  // ─── Permission flags ────────────────────
  const canEditDiscount  = userRole === 'admin';
  const canPrint         = userRole === 'admin' || userRole === 'atasan';
  const canRecordPayment = userRole === 'atasan';
  
  // [TAMBAHAN CANCEL INVOICE] Flag untuk izin membatalkan invoice
  const canCancelInvoice = userRole === 'admin' || userRole === 'atasan';

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);  
  const [customer, setCustomer] = useState<any>(null);
  const [billingAddress, setBillingAddress] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // State Pembayaran
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  // [TAMBAHAN CANCEL INVOICE] State Pembatalan
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // State Editor
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [invoiceNote, setInvoiceNote] = useState('');
  const [isSavingAll, setIsSavingAll] = useState(false);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invErr } = await supabase.from('invoices').select('*').eq('id', id).single();
      if (invErr) throw invErr;
      
      setInvoice(invData);
      setDiscountInput(invData.discount_amount || 0);
      setInvoiceNote(invData.due_date_note || 'Pembayaran ditransfer ke rekening:\nBank MANDIRI No. 1560024959530\na.n CV HARMONISINDO JAYA PART');

      const { data: payHistory } = await supabase.from('payments').select('*').eq('invoice_id', id).order('created_at', { ascending: true });
      if (payHistory) setPaymentsHistory(payHistory);

      if (invData.so_id) {
        const { data: soData } = await supabase.from('sales_orders').select('*').eq('id', invData.so_id).single();
        setSalesOrder(soData);

        if (soData?.customer_id) {
          const { data: custData } = await supabase.from('customers').select('*').eq('id', soData.customer_id).single();
          setCustomer(custData);

          const { data: allAddrs } = await supabase.from('customer_addresses').select('*').eq('customer_id', soData.customer_id);
          if (allAddrs && allAddrs.length > 0) {
            const billing = allAddrs.find((a: any) => a.address_type?.toLowerCase() === 'billing') || allAddrs[0];
            setBillingAddress(billing);
          }
        }
      }

      const { data: soItemsData } = await supabase
        .from('sales_order_items')
        .select(`id, qty, unit_price, total_price, products ( part_code, part_name, unit, remark )`)
        .eq('so_id', invData.so_id);

      const { data: invItemsData } = await supabase
        .from('invoice_items')
        .select('id, so_item_id, qty_billed, item_note')
        .eq('invoice_id', id);

      let finalItems: any[] = [];
      const initialNotes: Record<string, string> = {};

      if (soItemsData) {
        finalItems = soItemsData.map((soItem) => {
          const matchedInvItem = invItemsData?.find((invItem) => invItem.so_item_id === soItem.id);
          const targetId = matchedInvItem ? matchedInvItem.id : soItem.id;
          initialNotes[targetId] = matchedInvItem?.item_note || '';
          return {
            ...soItem,
            invoice_item_id: matchedInvItem?.id, 
            qty_billed: matchedInvItem?.qty_billed || soItem.qty,
            item_note: matchedInvItem?.item_note || ''
          };
        });
      }

      setItems(finalItems);
      setItemNotes(initialNotes);

    } catch (error) {
      console.error('Gagal memuat data invoice:', error);
      alert('Terjadi kesalahan saat memuat dokumen.');
    } finally {
      setLoading(false);
    }
  };

  const subTotal = items.reduce((sum, item) => sum + (item.total_price || (item.qty_billed * item.unit_price) || 0), 0);
  const grandTotal = subTotal - discountInput;
  const totalPaid = paymentsHistory.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const balanceDue = grandTotal - totalPaid;

  // [TAMBAHAN CANCEL INVOICE] Status Variables
  const isPaid = invoice?.status?.toLowerCase() === 'paid';
  const isCancelled = invoice?.status?.toLowerCase() === 'cancelled' || invoice?.status?.toLowerCase() === 'canceled';
  const isOverdue = new Date(invoice?.due_date) < new Date() && !isPaid && !isCancelled;
  const isEditable = !isPaid && !isCancelled; // Tidak bisa di-edit jika sudah lunas atau batal

  const handleSaveEdits = async () => {
    if (!canEditDiscount || !isEditable) return;
    setIsSavingAll(true);
    try {
      const { error: invErr } = await supabase.from('invoices')
        .update({ 
          discount_amount: discountInput, 
          grand_total: grandTotal,
          due_date_note: invoiceNote 
        })
        .eq('id', id);

      if (invErr) throw invErr;

      const updatePromises = items.map((item) => {
        const targetId = item.invoice_item_id;
        if (targetId) {
          return supabase
            .from('invoice_items')
            .update({ item_note: itemNotes[targetId] || '' })
            .eq('id', targetId);
        }
        return Promise.resolve({ error: null });
      });

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter((res) => res && res.error);
      if (failedUpdates.length > 0) {
        alert('Diskon berhasil disimpan, tetapi sebagian catatan gagal diperbarui.');
      } else {
        alert('Diskon dan Catatan berhasil disimpan!');
      }
      fetchInvoiceData(); 
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRecordPayment || isCancelled) return;
    if (payAmount <= 0) return alert('Nominal harus lebih dari 0');
    if (payAmount > balanceDue) return alert(`Nominal melebihi sisa tagihan! Maksimal: Rp ${balanceDue.toLocaleString('id-ID')}`);

    setIsSubmittingPayment(true);
    try {
      let proofUrl = null;
      if (paymentProofFile) {
        console.log("File siap di-upload:", paymentProofFile.name);
      }

      const { error: payErr } = await supabase.from('payments').insert({
        invoice_id: id,
        amount_paid: payAmount,
        payment_date: payDate,
        payment_method: 'Transfer Bank',
        reference_number: payRef || null,
        payment_proof_url: proofUrl 
      });
      if (payErr) throw payErr;

      alert('Pembayaran berhasil dicatat!');
      setIsPaymentModalOpen(false);
      setPayAmount(0);
      setPayRef('');
      setPaymentProofFile(null);
      setTimeout(() => fetchInvoiceData(), 500);
    } catch (error: any) {
      alert(`Gagal mencatat pembayaran: ${error.message}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // [TAMBAHAN CANCEL INVOICE] Fungsi Handler Pembatalan menggunakan RPC
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCancelInvoice) return;
    if (!cancelReason.trim()) return alert('Alasan pembatalan wajib diisi!');

    setIsSubmittingCancel(true);
    try {
      const { data, error } = await supabase.rpc('cancel_invoice', {
        p_invoice_id: id,
        p_reason: cancelReason
      });

      if (error) throw error;

      alert('Invoice berhasil dibatalkan!');
      setIsCancelModalOpen(false);
      setTimeout(() => fetchInvoiceData(), 500); // Refresh data
    } catch (error: any) {
      alert(`Gagal membatalkan invoice: ${error.message}`);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handlePrint = () => window.print();

  const MIN_ROWS = 8;
  const emptyRowsCount = Math.max(0, MIN_ROWS - items.length);

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold animate-pulse">Menyiapkan dokumen Invoice...</p>
    </div>
  );
  
  const borderCell = '1px solid #000';
  const font = "Arial, Helvetica, sans-serif";
  const baseSize = 11;

  if (!invoice) return (
    <div className="card-modern max-w-xl mx-auto p-10 text-center mt-10">
      <h3 className="text-lg font-bold text-rose-600 mb-2">Terjadi Kesalahan</h3>
      <Link href="/dashboard/invoices" className="btn-secondary inline-flex">Kembali ke Daftar</Link>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10 print:m-0 print:p-0 print:max-w-none text-black relative">

      {/* ── PANEL KONTROL ADMIN ── */}
      <div className="print:hidden w-full max-w-[210mm] mx-auto card-modern p-5 md:p-6 border-l-4 border-l-purple-500 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <Link href="/dashboard/invoices" className="inline-flex items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors border border-slate-200 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Dokumen</span>
              <div className="flex items-center gap-2 flex-wrap">
                {/* [TAMBAHAN CANCEL INVOICE] Badge Status Batal */}
                {isCancelled ? (
                  <span className="bg-rose-100 text-rose-800 border-rose-200 border px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider">🚫 DIBATALKAN</span>
                ) : isPaid ? (
                  <span className="badge-success">✅ LUNAS TERKUNCI</span>
                ) : invoice?.status === 'Partial' ? (
                  <span className="bg-blue-100 text-blue-700 border-blue-200 border px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider">⏳ PARSIAL (BELUM LUNAS)</span>
                ) : (
                  <span className="badge-danger">🚨 BELUM BAYAR</span>
                )}
                {isOverdue && <span className="text-[10px] text-white bg-rose-600 px-2 py-1 rounded font-black uppercase animate-pulse shadow-sm">OVERDUE!</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">

            {/* Input Diskon — hanya admin & atasan */}
            {canEditDiscount && (
              <div className="flex flex-col flex-1 w-full sm:w-36 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Diskon (Rp)</label>
                <input 
                  type="number" 
                  value={discountInput === 0 ? '' : discountInput}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  disabled={!isEditable} 
                  placeholder="0"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-rose-600 focus:border-purple-500 outline-none disabled:bg-slate-50 disabled:text-slate-400 text-right"
                />
              </div>
            )}

            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              {/* [TAMBAHAN CANCEL INVOICE] Tombol Batal Invoice */}
              {canCancelInvoice && !isPaid && !isCancelled && (
                 <button
                   onClick={() => setIsCancelModalOpen(true)}
                   className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-200 hover:border-rose-300 px-3 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px]"
                 >
                   🚫 Batalkan
                 </button>
              )}

              {/* Tombol Simpan — hanya admin & atasan */}
              {canEditDiscount && !isCancelled && (
                <button 
                  onClick={handleSaveEdits}
                  disabled={isSavingAll || !isEditable}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm h-[40px]"
                >
                  {isSavingAll ? '...' : '💾 Simpan'}
                </button>
              )}

              {/* Tombol Bayar — hanya atasan */}
              {canRecordPayment && !isPaid && !isCancelled && (
                <button
                  onClick={() => { setPayAmount(balanceDue); setIsPaymentModalOpen(true); }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-emerald-600/30 shadow-lg h-[40px]"
                >
                  💰 Bayar
                </button>
              )}
            </div>

            {/* Tombol Cetak — hanya admin & atasan */}
            {canPrint && (
              <button onClick={handlePrint} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px] mt-2 sm:mt-0">
                🖨️ Cetak PDF
              </button>
            )}
          </div>

        </div>

        {/* Info untuk admin: tombol bayar tidak tersedia */}
        {userRole === 'admin' && !isPaid && !isCancelled && (
          <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Pencatatan pembayaran hanya dapat dilakukan oleh Atasan.
          </p>
        )}
      </div>

      {/* ── WRAPPER PDF KERTAS A4 ── */}
      <div className="w-full overflow-x-auto pb-6 custom-scrollbar print:overflow-visible print:pb-0 relative">
        <div
          className="bg-white print:shadow-none print:border-none print:rounded-none relative overflow-hidden shadow-xl border border-slate-200 mx-auto"
          style={{ width: '210mm', padding: '20mm', fontFamily: font, fontSize: baseSize, color: '#000' }}
        >
          {isPaid && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[12px] border-emerald-500 text-emerald-500 px-10 py-2 rounded-3xl text-9xl font-black uppercase tracking-widest opacity-20 transform -rotate-[25deg] pointer-events-none z-50 print:opacity-[0.15]">
              PAID
            </div>
          )}
          
          {/* [TAMBAHAN CANCEL INVOICE] Watermark Canceled */}
          {isCancelled && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[12px] border-rose-500 text-rose-500 px-10 py-2 rounded-3xl text-7xl md:text-9xl font-black uppercase tracking-widest opacity-20 transform -rotate-[25deg] pointer-events-none z-50 print:opacity-[0.25]">
              CANCELED
            </div>
          )}

          {/* [TAMBAHAN CANCEL INVOICE] Banner Riwayat Batal di dalam Kertas (Biar Tercetak) */}
          {isCancelled && (
            <div className="mb-6 p-4 border-2 border-rose-500 bg-rose-50 text-rose-900 rounded-lg" style={{ fontSize: 12 }}>
              <strong className="block mb-1 text-sm uppercase tracking-wider text-rose-700">⚠ INVOICE INI TELAH DIBATALKAN / HANGUS</strong>
              <table className="mt-2 text-xs">
                <tbody>
                  <tr><td className="w-24 font-bold">Waktu Batal</td><td>: {new Date(invoice?.canceled_at).toLocaleString('id-ID')}</td></tr>
                  <tr><td className="font-bold align-top">Alasan</td><td>: {invoice?.cancel_reason || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ===== HEADER ===== */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, letterSpacing: 0.3 }}>CV HARMONISINDO JAYA PART</div>
              <div style={{ fontSize: 10, lineHeight: 1.6 }}>
                SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman<br />
                Kav. 28, Kelurahan Tanjung Duren Selatan<br />
                Kec. Grogol Petamburan, Jakarta Barat
              </div>
            </div>
            <div style={{ width: 90, height: 90, flexShrink: 0 }}>
              <img src="/logo1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '1px 0 1px 0' }} />

          <div style={{ textAlign: 'center', marginTop: 2}}>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, textDecoration: 'underline' }}>INVOICE</div>
            <div style={{ fontSize: 10 }}>Invoice No. {invoice?.invoice_number}</div>
          </div>

          {/* ===== TO & META ===== */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: borderCell, marginTop: 3, marginBottom: 16, fontSize: baseSize }}>
            <tbody>
              <tr>
                <td style={{ borderRight: borderCell, padding: '8px', verticalAlign: 'top', width: '50%' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: 45, fontWeight: 700, verticalAlign: 'top' }}>TO</td>
                        <td style={{ width: 15, fontWeight: 700, verticalAlign: 'top' }}>:</td>
                        <td style={{ fontWeight: 900, textTransform: 'uppercase' }}>{customer?.company_name}</td>
                      </tr>
                      <tr>
                        <td></td><td></td>
                        <td style={{ paddingBottom: 3, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                          {billingAddress?.complete_address || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>Attn</td>
                        <td style={{ fontWeight: 700 }}>:</td>
                        <td style={{ paddingBottom: 3 }}>{billingAddress?.pic_name || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>Telp</td>
                        <td style={{ fontWeight: 700 }}>:</td>
                        <td style={{ paddingBottom: 3 }}>{billingAddress?.pic_phone ? `(+62) ${billingAddress.pic_phone}` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ padding: '8px', verticalAlign: 'top', width: '50%' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: baseSize }}>
                    <tbody>
                      <tr>
                        <td style={{ width: 100, paddingBottom: 3 }}>No PO</td>
                        <td style={{ width: 15, paddingBottom: 3 }}>:</td>
                        <td style={{ paddingBottom: 3 }}>{salesOrder?.po_number || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: 3 }}>Date</td>
                        <td style={{ paddingBottom: 3 }}>:</td>
                        <td style={{ paddingBottom: 3 }}>{invoice?.issue_date ? fmtDate(invoice.issue_date) : invoice?.created_at ? fmtDate(invoice.created_at) : '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: 3 }}>Payment Terms</td>
                        <td style={{ paddingBottom: 3 }}>:</td>
                        <td style={{ paddingBottom: 3 }}>Cash</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: 40 }}>Delivery Terms</td>
                        <td style={{ paddingBottom: 40 }}>:</td>
                        <td style={{ paddingBottom: 40 }}>Franco Site</td>
                      </tr>
                      <tr>
                        <td>Page</td>
                        <td>:</td>
                        <td>1 of 1</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== TABEL ITEM ===== */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0, tableLayout: 'fixed', fontSize: baseSize }}>
            <colgroup>
              <col style={{ width: 30 }} />    
              <col style={{ width: 120 }} />    
              <col />                           
              <col style={{ width: 38 }} />    
              <col style={{ width: 100 }} />    
              <col style={{ width: 110 }} />    
              <col style={{ width: 60 }} />    
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>NO</th>
                <th style={thStyle}>PART NUMBER</th>
                <th style={thStyle}>DESCRIPTION</th>
                <th style={thStyle}>QTY</th>
                <th style={thStyle}>PRICE</th>
                <th style={thStyle}>AMOUNT</th>
                <th style={thStyle}>NOTE</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const product = item.products || item;
                const qty = item.qty_billed || item.qty || 1;
                const price = item.unit_price || 0;
                const amount = item.total_price || (qty * price);
                const noteTargetId = item.invoice_item_id || item.id;

                return (
                  <tr key={item.id || index}>
                    <td style={{ ...tdItem, textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>
                    <td style={{ ...tdItem, verticalAlign: 'center' }}>{product?.part_code || '-'}</td>
                    <td style={{ ...tdItem, whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'top' }}>{product?.part_name || '-'}</td>
                    <td style={{ ...tdItem, textAlign: 'center', verticalAlign: 'top' }}>{qty}</td>
                    <td style={{ ...tdItem, verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Rp</span><span>{price.toLocaleString('id-ID')}</span>
                      </div>
                    </td>
                    <td style={{ ...tdItem, verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Rp</span><span>{amount.toLocaleString('id-ID')}</span>
                      </div>
                    </td>
                    <td style={{ ...tdItem, padding: 0, verticalAlign: 'center' }}>
                      <textarea 
                        rows={1}
                        value={itemNotes[noteTargetId] !== undefined ? itemNotes[noteTargetId] : ''}
                        onChange={(e) => {
                          setItemNotes({ ...itemNotes, [noteTargetId]: e.target.value });
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        disabled={!isEditable}
                        placeholder=""
                        className="w-full bg-transparent border-none outline-none px-2 py-1.5 text-[10px] text-center focus:bg-purple-50 print:p-0 print:focus:bg-transparent disabled:text-black font-medium resize-none overflow-hidden"
                        style={{ minHeight: '26px' }}
                      />
                    </td>
                  </tr>
                );
              })}
              
              {Array.from({ length: emptyRowsCount }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={{ ...tdItem, height: 26 }}></td><td style={tdItem}></td><td style={tdItem}></td>
                  <td style={tdItem}></td><td style={tdItem}></td><td style={tdItem}></td><td style={tdItem}></td>
                </tr>
              ))}

              {/* BARIS FOOTER TERINTEGRASI TABEL */}
              <tr>
                <td colSpan={4} rowSpan={3} style={{ border: borderCell, borderTop: '3px double #000', padding: '10px 14px', verticalAlign: 'top' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 900, textDecoration: 'underline' }}>PAYMENT INSTRUCTION / NOTES :</p>
                  <textarea 
                    value={invoiceNote}
                    onChange={(e) => setInvoiceNote(e.target.value)}
                    disabled={!isEditable}
                    className="w-full h-24 bg-transparent border-none outline-none resize-none text-[11px] leading-relaxed disabled:text-black font-medium"
                    placeholder="Tulis instruksi transfer di sini..."
                  />
                </td>
                <td style={{ border: borderCell, borderTop: '3px double #000', padding: '1px 1px', fontWeight: 700 }}>Sub Total</td>
                <td colSpan={2} style={{ border: borderCell, borderTop: '3px double #000', padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rp</span>
                    <span style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {subTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ border: borderCell, padding: '6px 10px', fontWeight: 700 }}>Discount</td>
                <td colSpan={2} style={{ border: borderCell, padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: discountInput > 0 ? '#e11d48' : '#000' }}>
                    <span>Rp</span><span>{discountInput > 0 ? discountInput.toLocaleString('id-ID') : '-'}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ border: borderCell, padding: '6px 10px', fontWeight: 700 }}>Total</td>
                <td colSpan={2} style={{ border: borderCell, padding: '6px 8px', fontWeight: 900 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rp</span>
                    <span style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {grandTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== TANGGAL & TANDA TANGAN ===== */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center', minWidth: 160 }}>
              <p style={{ margin: 0, fontSize: baseSize }}>Jakarta, {todayFormatted}</p>
              <p style={{ margin: 0, fontSize: baseSize }}>Harmonisindo JayaPart</p>
              <div style={{ height: 72 }} />
              <p style={{ margin: 0, fontSize: baseSize, fontWeight: 700, textDecoration: 'underline' }}>Hana Khamila</p>
              <p style={{ margin: 0, fontSize: baseSize }}>Finance</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── RIWAYAT PEMBAYARAN ── */}
      {paymentsHistory.length > 0 && (
        <div className="print:hidden w-full max-w-[210mm] mx-auto bg-white border border-slate-300 shadow-sm mt-6 p-6 sm:p-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase border-b-2 border-slate-800 pb-2 mb-4 tracking-wider">
            Riwayat Pembayaran (Payment History)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50">
                  <th className="py-2.5 px-3 font-bold text-slate-700 uppercase">Tanggal</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 uppercase">Metode / Ref</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 uppercase text-center">Bukti</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 uppercase text-right">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paymentsHistory.map((pay: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-slate-800 whitespace-nowrap">{fmtDate(pay.payment_date)}</td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {pay.payment_method || 'Transfer'} 
                      {pay.reference_number ? ` (Ref: ${pay.reference_number})` : ''}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">
                      {pay.payment_proof_url ? (
                        <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">Terlampir</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {pay.amount_paid.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-800">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-right font-bold text-slate-800 uppercase">Total Dibayar:</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">Rp {totalPaid.toLocaleString('id-ID')}</td>
                </tr>
                {!isPaid && !isCancelled && (
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right font-bold text-slate-600 uppercase">Sisa Piutang:</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-600">Rp {balanceDue.toLocaleString('id-ID')}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL INPUT PEMBAYARAN ── */}
      {isPaymentModalOpen && canRecordPayment && !isCancelled && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center p-4 print:hidden items-end sm:items-center sm:p-6 overflow-y-auto">
          <form onSubmit={handlePaymentSubmit} className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] my-auto animate-in slide-in-from-bottom-10 sm:scale-in-center duration-300">
            
            <div className="shrink-0 bg-emerald-600 p-5 text-white flex justify-between items-center rounded-t-2xl sm:rounded-t-2xl">
              <div>
                <h2 className="text-xl font-black">Catat Uang Masuk</h2>
                <p className="text-emerald-100 text-xs font-mono mt-0.5">{invoice?.invoice_number}</p>
              </div>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-emerald-200 hover:text-white bg-emerald-700/50 hover:bg-emerald-700 p-2 rounded-lg transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-center border border-amber-200 shadow-inner">
                <span className="label-modern justify-center mb-1 text-amber-700/60">Sisa Tagihan (Piutang)</span>
                <span className="text-2xl font-black">Rp {balanceDue.toLocaleString('id-ID')}</span>
              </div>
              
              <div>
                <label className="label-modern">Nominal Transfer (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-black text-slate-400">Rp</span>
                  <input 
                    type="number" 
                    max={balanceDue} 
                    required 
                    value={payAmount === 0 ? '' : payAmount} 
                    onChange={(e) => setPayAmount(Number(e.target.value))} 
                    className="input-modern pl-12 text-lg font-black text-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/20" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-modern">Tanggal Transfer</label>
                  <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="input-modern" />
                </div>
                <div>
                  <label className="label-modern">No. Referensi Bank</label>
                  <input type="text" placeholder="Mis: TRF-BCA-01" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="input-modern" />
                </div>
              </div>

              <div>
                <label className="label-modern">Upload Bukti Transfer (Opsional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-bold text-emerald-600 hover:text-emerald-500 focus-within:outline-none">
                        <span>Pilih Gambar</span>
                        <input type="file" className="sr-only" accept="image/*,.pdf" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">Maks 2MB</p>
                  </div>
                  
                  {paymentProofFile && (
                    <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center p-4">
                      <span className="text-3xl mb-2">📸</span>
                      <span className="text-xs font-black text-emerald-700 truncate w-full text-center">{paymentProofFile.name}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); setPaymentProofFile(null); }} className="text-[10px] text-rose-500 font-bold uppercase mt-2 hover:underline">Hapus File</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="shrink-0 p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-2xl">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn-secondary">Batal</button>
              <button type="submit" disabled={isSubmittingPayment} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm disabled:bg-emerald-300 transition-colors">
                {isSubmittingPayment ? 'Memproses...' : 'Simpan Uang Masuk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── [TAMBAHAN CANCEL INVOICE] MODAL PEMBATALAN ── */}
      {isCancelModalOpen && canCancelInvoice && !isCancelled && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex justify-center p-4 print:hidden items-center overflow-y-auto">
          <form onSubmit={handleCancelSubmit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-300">
            
            <div className="shrink-0 bg-rose-600 p-5 text-white flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Batalkan Invoice
                </h2>
                <p className="text-rose-100 text-xs mt-0.5">{invoice?.invoice_number}</p>
              </div>
              <button type="button" onClick={() => setIsCancelModalOpen(false)} className="text-rose-200 hover:text-white bg-rose-700/50 hover:bg-rose-700 p-2 rounded-lg transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <p className="text-sm text-slate-600 leading-relaxed">
                Tindakan ini <strong className="text-rose-600">tidak dapat dibatalkan</strong>. Invoice yang dibatalkan tidak akan dihitung ke dalam laporan KPI dan target pendapatan perusahaan.
              </p>
              
              <div>
                <label className="label-modern font-bold text-slate-800">Alasan Pembatalan <span className="text-rose-500">*</span></label>
                <textarea 
                  required 
                  rows={4}
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  placeholder="Berikan alasan detail (contoh: Salah input harga, retur barang, dll)"
                  className="input-modern mt-1 resize-none" 
                />
              </div>
            </div>
            
            <div className="shrink-0 p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setIsCancelModalOpen(false)} className="btn-secondary">Kembali</button>
              <button type="submit" disabled={isSubmittingCancel} className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm disabled:bg-rose-300 transition-colors">
                {isSubmittingCancel ? 'Memproses...' : 'Ya, Batalkan Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

/* ─── Style helpers ─── */
const thStyle: React.CSSProperties = {
  border: '1px solid #000', borderBottom: '3px double #000', borderTop: '1px solid #000',
  padding: '5px 6px', textAlign: 'center', background: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
};

const tdItem: React.CSSProperties = {
  border: '1px solid #000', padding: '8px 7px', fontSize: 11, verticalAlign: 'center', color: '#000',
};