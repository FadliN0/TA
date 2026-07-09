'use client';

import Link from 'next/link';

export default function DeliveryOrderDetailClient({
  deliveryOrder,
  salesOrder,
  customer,
  billingAddress,
  shippingAddress,
  items,
  isPartialDelivery,
  invoiceNumber,
}: {
  deliveryOrder: any;
  salesOrder: any;
  customer: any;
  billingAddress: any;
  shippingAddress: any;
  items: any[];
  isPartialDelivery: boolean;
  invoiceNumber: string | null;
}) {
  const handlePrint = () => window.print();
  const totalQty = items.reduce((sum, item) => sum + (item.qty_delivered || 0), 0);

  const MIN_ROWS = 7;
  const emptyRowsCount = Math.max(0, MIN_ROWS - items.length);

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-10 print:m-0 print:p-0 print:max-w-none text-black relative">

      {/* ── KONTROL UI (GAYA MODERN FIT TO A4) ── */}
      <div className="print:hidden w-full max-w-[210mm] mx-auto card-modern p-5 md:p-6 border-l-4 border-l-teal-500 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link href="/dashboard/delivery-orders" className="inline-flex items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors border border-slate-200 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Pengiriman</span>
              {isPartialDelivery ? (
                <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider inline-block">
                  ⏳ DIKIRIM SEBAGIAN (PARTIAL)
                </span>
              ) : (
                <span className="bg-teal-100 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider inline-block">
                  ✅ SELESAI (COMPLETED)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Cetak Surat Jalan
          </button>
        </div>
      </div>

      {/* ── WRAPPER PDF (KERTAS A4) ── */}
      <div className="w-full overflow-x-auto pb-8 custom-scrollbar print:overflow-visible print:pb-0">

        {/* KERTAS A4 */}
        <div
          className="bg-white shadow-xl border border-slate-200 print:shadow-none print:border-none mx-auto relative overflow-hidden"
          style={{
            width: '210mm',
            minHeight: '290mm',
            padding: '64px 72px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 12,
            color: '#000',
          }}
        >

            {/* ===== HEADER ===== */}
            
            {/* 1. Logo dipisah dan diletakkan di atas */}
            <div style={{ width: 120, height: 100, flexShrink: 0 }}>
              <img src="/logo1.png" alt="Logo" style={{ width: '100%', height: '120%', objectFit: 'contain' }} />
            </div>

            {/* 2. Kontainer Flex baru khusus untuk menyejajarkan Teks Kiri dan Teks Kanan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              
              {/* Teks Kiri */}
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#000', marginBottom: 1, letterSpacing: 0.5 }}>CV HARMONISINDO JAYA PART</div>
                <div style={{ fontSize: 12, color: '#000', lineHeight: 1.5 }}>
                  SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman<br />
                  Kav. 28, Kelurahan Tanjung Duren Selatan<br />
                  Kec. Grogol Petamburan, Jakarta Barat
                </div>
              </div>

              {/* Teks Kanan */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, marginBottom: 1 }}>DELIVERY ORDER</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 1 }}>{deliveryOrder.do_number}</div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  {new Date(deliveryOrder.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 10, color: '#444', fontWeight: 'bold' }}>REF PO: {salesOrder?.po_number?.toUpperCase() || '-'}</div>
                {invoiceNumber && (
                  <div  style={{ fontSize: 10, color: '#444', fontWeight: 'bold' }}>
                    REF INV: {invoiceNumber.toUpperCase()}
                  </div>
                )}
              </div>
              
            </div>

          {/* ===== ALAMAT TO & KIRIM KE ===== */}
          <div style={{ marginBottom: 24,marginTop: 5, fontSize: 11, width: '55%' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td style={{ width: 45, verticalAlign: 'top' }}>To</td>
                  <td style={{ width: 15, verticalAlign: 'top' }}>:</td>
                  <td style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{customer?.company_name}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td style={{ paddingBottom: 3, lineHeight: 1.4, whiteSpace: 'pre-wrap',  wordBreak: 'break-word' }}>
                    {billingAddress?.complete_address || shippingAddress?.complete_address || '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>Attn</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td style={{ paddingBottom: 16 }}>
                    {billingAddress?.pic_name || shippingAddress?.pic_name || '-'}
                    {billingAddress?.pic_phone ? ` ${billingAddress.pic_phone}` : shippingAddress?.pic_phone ? ` ${shippingAddress.pic_phone}` : ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>Attn</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td style={{ paddingBottom: 3 }}>
                    {shippingAddress?.pic_name || '-'}
                    {shippingAddress?.pic_phone ? ` ${shippingAddress.pic_phone}` : ''}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ fontWeight: 700, paddingBottom: 4 }}>Deliver To :</td>
                </tr>
                <tr>
                  <td></td><td></td>
                  <td style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{customer?.company_name}</td>
                </tr>
                <tr>
                  <td></td><td></td>
                  <td style={{ lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {shippingAddress?.complete_address || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ===== TABEL BARANG ===== */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 45 }} />
              <col style={{ width: 130 }} />
              <col />
              <col style={{ width: 60 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>No.</th>
                <th style={thStyle}>Part No</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Uom</th>
                <th style={thStyle}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const product = item.sales_order_items?.products;
                return (
                  <tr key={item.id}>
                    <td style={{ ...tdItem, textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ ...tdItem, fontWeight: 700 }}>{product?.part_code || '-'}</td>
                    <td style={{ ...tdItem, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {product?.part_name || '-'}
                    </td>
                    <td style={{ ...tdItem, textAlign: 'center', fontWeight: 800 }}>{item.qty_delivered}</td>
                    <td style={{ ...tdItem, textAlign: 'center' }}>{product?.unit || 'PCS'}</td>
                    <td style={{ ...tdItem, textAlign: 'center', fontSize: 10 }}>
                      {product?.remark || '-'}
                    </td>
                  </tr>
                );
              })}

              {Array.from({ length: emptyRowsCount }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={{ ...tdItem, height: 26 }}></td>
                  <td style={tdItem}></td>
                  <td style={tdItem}></td>
                  <td style={tdItem}></td>
                  <td style={tdItem}></td>
                  <td style={tdItem}></td>
                </tr>
              ))}

              <tr>
                <td colSpan={3} style={{ ...tdItem, textAlign: 'right', fontWeight: 'bold' }}>Total :</td>
                <td style={{ ...tdItem, textAlign: 'center', fontWeight: 900 }}>{totalQty}</td>
                <td style={tdItem}></td>
                <td style={tdItem}></td>
              </tr>
            </tbody>
          </table>

          {/* ===== TANDA TANGAN ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, pageBreakInside: 'avoid', marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Receipt By,</p>
              <div style={{ height: 120 }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold' }}>Nama jelas &</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold' }}>Stample</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Dikirim oleh,</p>
              <div style={{ height: 120 }} />
              <p style={{ margin: 0, fontSize: 11 }}>........................</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Dibuat oleh,</p>
              <div style={{ height: 120 }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', textDecoration: 'underline' }}>Fatin</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Diketahui oleh,</p>
              <div style={{ height: 120 }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', textDecoration: 'underline' }}>Hana Khamila</p>
            </div>
          </div>

        </div>
      </div>
      {/* ── AKHIR WRAPPER PDF ── */}

    </div>
  );
}

/* ─── Style helpers ─── */
const thStyle: React.CSSProperties = { border: '1px solid #000', padding: '8px 6px', textAlign: 'center', background: '#f8f9fa', fontSize: 11, fontWeight: 'bold' };
const tdItem: React.CSSProperties = { border: '1px solid #000', padding: '6px 8px', fontSize: 11, verticalAlign: 'middle', color: '#000' };