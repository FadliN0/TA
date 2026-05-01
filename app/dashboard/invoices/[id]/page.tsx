'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [billingAddress, setBillingAddress] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // === NEW: State untuk Pembayaran ===
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');

  // State untuk Input Diskon Manual
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

  // Tanggal hari ini — selalu update otomatis
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

      // === NEW: Fetch Payment History ===
      const { data: payHistory } = await supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('created_at', { ascending: true });
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

        const { data: doData } = await supabase.from('delivery_orders')
          .select('*')
          .eq('so_id', invData.so_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (doData && doData.length > 0) setDeliveryOrder(doData[0]);
      }

      const { data: itemsData, error: iErr } = await supabase
        .from('invoice_items')
        .select(`id, qty_billed, unit_price, total_price, products ( part_code, part_name, unit )`)
        .eq('invoice_id', id);

      if (!iErr && itemsData && itemsData.length > 0) {
        setItems(itemsData);
      } else {
        const { data: soItemsData } = await supabase
          .from('sales_order_items')
          .select(`id, qty, unit_price, total_price, products ( part_code, part_name, unit )`)
          .eq('so_id', invData.so_id);
        if (soItemsData) setItems(soItemsData);
      }
    } catch (error) {
      console.error('Gagal memuat data invoice:', error);
      alert('Data Invoice tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  const subTotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const discountAmount = invoice?.discount_amount || 0;
  const grandTotal = subTotal - discountAmount;
  
  // === NEW: Kalkulasi Sisa Tagihan ===
  const amountPaid = invoice?.amount_paid || 0;
  const balanceDue = grandTotal - amountPaid;

  const handleSaveDiscount = async () => {
    setIsSavingDiscount(true);
    try {
      const newGrandTotal = subTotal - discountInput;
      const { error } = await supabase.from('invoices')
        .update({ discount_amount: discountInput, grand_total: newGrandTotal })
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchInvoiceData();
      alert('Diskon berhasil diupdate!');
    } catch (error) {
      console.error(error);
      alert('Gagal mengupdate diskon.');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  // === NEW: Handle Submit Payment ke Stored Procedure ===
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return alert('Nominal harus lebih dari 0');
    setIsSubmittingPayment(true);
    try {
      const { error } = await supabase.rpc('record_payment', {
        p_invoice_id: id,
        p_amount: payAmount,
        p_date: payDate,
        p_method: 'Transfer Bank',
        p_ref: payRef,
        p_notes: 'Pencatatan manual'
      });
      if (error) throw error;
      
      setIsPaymentModalOpen(false);
      setPayRef('');
      await fetchInvoiceData();
    } catch (error: any) {
      alert(`Gagal mencatat pembayaran: ${error.message}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePrint = () => window.print();

  const MIN_ROWS = 8;
  const emptyRowsCount = Math.max(0, MIN_ROWS - items.length);

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      .replace(/ /g, '-');

  if (loading) return <div className="p-8 text-center text-gray-500">Menyiapkan dokumen Invoice...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Dokumen tidak ditemukan.</div>;

  const borderCell = '1px solid #000';
  const font = "Arial, Helvetica, sans-serif";
  const baseSize = 11;

  return (
    <div className="max-w-4xl mx-auto space-y-4 print:m-0 print:p-0 print:max-w-none text-black relative">

      {/* ── KONTROL UI (tidak tercetak) ── */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <Link href="/dashboard/invoices" className="text-sm font-bold text-gray-500 hover:text-blue-600">
          ← Kembali ke Daftar Invoice
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
            <label className="text-xs font-bold text-gray-600">Diskon (Rp):</label>
            <input 
              type="number" 
              value={discountInput}
              onChange={(e) => setDiscountInput(Number(e.target.value))}
              disabled={invoice.status === 'Paid'} // Kunci diskon kalau lunas
              className="w-32 px-2 py-1 border rounded outline-none text-right text-sm disabled:bg-gray-200"
            />
            {invoice.status !== 'Paid' && (
              <button 
                onClick={handleSaveDiscount}
                disabled={isSavingDiscount}
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded font-bold disabled:bg-green-300"
              >
                {isSavingDiscount ? 'Save...' : 'Save'}
              </button>
            )}
          </div>

          {/* NEW: Tombol Bayar */}
          {invoice.status !== 'Paid' && (
            <button
              onClick={() => { setPayAmount(balanceDue); setIsPaymentModalOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2"
            >
              💰 Catat Pembayaran
            </button>
          )}

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2"
          >
            🖨️ Cetak Invoice
          </button>
        </div>
      </div>

      {/* ── NEW: RIWAYAT PEMBAYARAN (Tidak Tercetak) ── */}
      {paymentsHistory.length > 0 && (
        <div className="print:hidden bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
          <h3 className="text-sm font-bold text-emerald-800 mb-2 flex justify-between">
            <span>Riwayat Pembayaran</span>
            <span>Sisa Tagihan: Rp {balanceDue.toLocaleString('id-ID')}</span>
          </h3>
          <div className="space-y-2">
            {paymentsHistory.map((pay: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded border shadow-sm">
                <div>
                  <span className="font-bold text-gray-700">{fmtDate(pay.payment_date)}</span>
                  <span className="ml-2 text-gray-500">Ref: {pay.reference_number || '-'}</span>
                </div>
                <div className="font-black text-emerald-600">+ Rp {pay.amount.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KERTAS A4 ── */}
      <div
        className="bg-white print:shadow-none print:rounded-none relative overflow-hidden"
        style={{ padding: '36px 48px', fontFamily: font, fontSize: baseSize, color: '#000' }}
      >
        {/* NEW: WATERMARK LUNAS */}
        {invoice.status === 'Paid' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[12px] border-red-500 text-red-500 px-8 py-2 rounded-3xl text-9xl font-black uppercase tracking-widest opacity-15 transform -rotate-12 pointer-events-none z-50">
            LUNAS
          </div>
        )}

        {/* ===== HEADER ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, letterSpacing: 0.3 }}>CV HARMONISINDO JAYA PART</div>
            <div style={{ fontSize: 10, lineHeight: 1.6 }}>
              SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman<br />
              Kav. 28, Kelurahan Tanjung Duren Selatan<br />
              Kec. Grogol Petamburan, Jakarta Barat
            </div>
          </div>
          <div style={{ width: 90, height: 90, flexShrink: 0 }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '10px 0 14px 0' }} />

        <div style={{ textAlign: 'center', marginBottom: 2 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, textDecoration: 'underline' }}>INVOICE</div>
          <div style={{ fontSize: 10, marginTop: 2 }}>Invoice No. {invoice.invoice_number}</div>
        </div>

        {/* ===== TO & META ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: borderCell, marginTop: 12, marginBottom: 16, fontSize: baseSize }}>
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
                      <td style={{ paddingBottom: 16, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {billingAddress?.complete_address || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Attn</td>
                      <td style={{ fontWeight: 700 }}>:</td>
                      <td style={{ paddingBottom: 6 }}>{billingAddress?.pic_name || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Telp</td>
                      <td style={{ fontWeight: 700 }}>:</td>
                      <td style={{ paddingBottom: 6 }}>{billingAddress?.pic_phone ? `(+62) ${billingAddress.pic_phone}` : '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Email</td>
                      <td style={{ fontWeight: 700 }}>:</td>
                      <td>{customer?.email || billingAddress?.email || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ padding: '8px', verticalAlign: 'top', width: '50%' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: baseSize }}>
                  <tbody>
                    <tr>
                      <td style={{ width: 100, paddingBottom: 4 }}>No PO</td>
                      <td style={{ width: 15, paddingBottom: 4 }}>:</td>
                      <td style={{ paddingBottom: 4 }}>{salesOrder?.po_number || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: 4 }}>Date</td>
                      <td style={{ paddingBottom: 4 }}>:</td>
                      <td style={{ paddingBottom: 4 }}>{invoice.issue_date ? fmtDate(invoice.issue_date) : fmtDate(invoice.created_at)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: 4 }}>Payment Terms</td>
                      <td style={{ paddingBottom: 4 }}>:</td>
                      <td style={{ paddingBottom: 4 }}>Cash</td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: 16 }}>Delivery Terms</td>
                      <td style={{ paddingBottom: 16 }}>:</td>
                      <td style={{ paddingBottom: 16 }}>Franco Site</td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: 4 }}>Currency</td>
                      <td style={{ paddingBottom: 4 }}>:</td>
                      <td style={{ paddingBottom: 4 }}>{invoice.currency || 'IDR'}</td>
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

        {/* ===== TABEL ITEM & FOOTER TERINTEGRASI ===== */}
        <table style={{ width: '100%',   borderCollapse: 'collapse', marginBottom: 0, tableLayout: 'fixed', fontSize: baseSize }}>
          <colgroup>
            <col style={{ width: 38 }} />     {/* 1. No */}
            <col style={{ width: 110 }} />    {/* 2. Part No */}
            <col />                           {/* 3. Description */}
            <col style={{ width: 45 }} />     {/* 4. Qty */}
            <col style={{ width: 110 }} />    {/* 5. Price */}
            <col style={{ width: 120 }} />    {/* 6. Amount */}
            <col style={{ width: 60 }} />     {/* 7. Note */}
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Part Number</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Note</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const product = item.products || item;
              const qty = item.qty_billed || item.qty;
              return (
                <tr key={item.id || index}>
                  <td style={{ ...tdItem, textAlign: 'center' }}>{index + 1}</td>
                  <td style={tdItem}>{product?.part_code || '-'}</td>
                  <td style={{ ...tdItem, whiteSpace: 'normal', wordBreak: 'break-word' }}>{product?.part_name || '-'}</td>
                  <td style={{ ...tdItem, textAlign: 'center' }}>{qty}</td>
                  <td style={{ ...tdItem, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rp.</span><span>{item.unit_price?.toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                  <td style={{ ...tdItem, padding: '5px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rp.</span><span>{item.total_price?.toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                  <td style={tdItem}></td>
                </tr>
              );
            })}
            
            {/* Baris Kosong Pengisi Tabel */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ ...tdItem, height: 26 }}></td><td style={tdItem}></td><td style={tdItem}></td>
                <td style={tdItem}></td><td style={tdItem}></td><td style={tdItem}></td><td style={tdItem}></td>
              </tr>
            ))}

            {/* ===== FOOTER GABUNGAN (LURUS SEMPURNA) ===== */}
            
            {/* 1. Baris Sub Total */}
            <tr>
              <td colSpan={4} rowSpan={3} style={{ border: borderCell,borderTop: '3px double #000',  padding: '10px 14px', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Waktu Pembayaran</span>
                  <span>:&nbsp;{invoice.payment_due_note || 'Before Delivery'}</span>
                </div>
                <div style={{ fontSize: 10, lineHeight: 1.6, marginTop: 4 }}>
                  <div>Mohon pembayar ditransfer</div>
                  <div>ke-rekening MANDIRI dibawah ini :</div>
                  <div style={{ marginTop: 4, fontWeight: 700, fontStyle: 'italic' }}>
                    Rekening Bank MANDIRI No. 1560024959530 a.n CV<br />
                    HARMONISINDO JAYA PART
                  </div>
                </div>
              </td>
              {/* Label menempati kolom Price */}
              <td style={{ border: borderCell,borderTop: '3px double #000', padding: '6px 10px', fontWeight: 700 }}>
                Sub Total
              </td>
              {/* Value menempati kolom Amount & Note */}
              <td colSpan={2} style={{ border: borderCell, borderTop: '3px double #000',padding: '6px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rp.</span><span>{subTotal.toLocaleString('id-ID')}</span>
                </div>
              </td>
            </tr>

            {/* 2. Baris Discount */}
            <tr>
              <td style={{ border: borderCell,  padding: '6px 10px', fontWeight: 700 }}>
                Discount
              </td>
              <td colSpan={2} style={{ border: borderCell, padding: '6px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rp.</span><span>{discountAmount > 0 ? discountAmount.toLocaleString('id-ID') : '-'}</span>
                </div>
              </td>
            </tr>

            {/* 3. Baris Total */}
            <tr>
              <td style={{ border: borderCell, padding: '6px 10px', fontWeight: 700 }}>
                Total
              </td>
              <td colSpan={2} style={{ border: borderCell, padding: '6px 8px', fontWeight: 700 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rp.</span><span>{grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </td>
            </tr>

          </tbody>
        </table>

        {/* ===== TANGGAL & TANDA TANGAN ===== */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <p style={{ margin: 0, fontSize: baseSize }}>Jakarta, {todayFormatted}</p>
            <p style={{ margin: 0, fontSize: baseSize }}>Harmonisindo JayaPart</p>
            <div style={{ height: 72 }} />
            <p style={{ margin: 0, fontSize: baseSize, fontWeight: 700, textDecoration: 'underline' }}>Hana Khamila</p>
            <p style={{ margin: 0, fontSize: baseSize }}>Direktur</p>
          </div>
        </div>

      </div>

      {/* ── NEW: MODAL INPUT PEMBAYARAN (Tidak Tercetak) ── */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 print:hidden">
          <form onSubmit={handlePaymentSubmit} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-emerald-600 p-4 text-white text-center">
              <h2 className="text-xl font-black">Catat Uang Masuk</h2>
              <p className="text-emerald-100 text-sm">Invoice {invoice.invoice_number}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm font-bold text-center border border-orange-200">
                Sisa Tagihan: Rp {balanceDue.toLocaleString('id-ID')}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nominal Dibayar (Rp)</label>
                <input type="number" max={balanceDue} required value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} className="w-full border-2 border-gray-200 rounded p-3 mt-1 text-lg font-bold text-gray-800 focus:border-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Tanggal Transfer</label>
                  <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full border-2 border-gray-200 rounded p-2 mt-1 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">No. Referensi / Bukti</label>
                  <input type="text" placeholder="Mis: TRF-BCA-01" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full border-2 border-gray-200 rounded p-2 mt-1 text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
              <button type="submit" disabled={isSubmittingPayment} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow disabled:bg-emerald-300">
                {isSubmittingPayment ? 'Menyimpan...' : 'Simpan'}
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
  border: '1px solid #000',
  borderBottom: '3px double #000', 
  borderTop: '1px solid #000',
  padding: '7px 6px',
  textAlign: 'center',
  background: '#fff',
  fontSize: 11,
  fontWeight: 700,
};

const tdItem: React.CSSProperties = {
  border: '1px solid #000',
  padding: '5px 7px',
  fontSize: 11,
  verticalAlign: 'middle',
  color: '#000',
};