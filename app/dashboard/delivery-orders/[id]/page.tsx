'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DeliveryOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [deliveryOrder, setDeliveryOrder] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [billingAddress, setBillingAddress] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // State untuk deteksi Partial vs Completed
  const [isPartialDelivery, setIsPartialDelivery] = useState(false);

  useEffect(() => {
    fetchDOData();
  }, [id]);

  const fetchDOData = async () => {
    setLoading(true);
    try {
      const { data: doData, error: doErr } = await supabase.from('delivery_orders').select('*').eq('id', id).single();
      if (doErr) throw doErr;
      setDeliveryOrder(doData);

      let soItemsDataMap: Record<string, number> = {}; // Menyimpan total qty pesanan per barang

      if (doData.so_id) {
        const { data: soData } = await supabase.from('sales_orders').select('*').eq('id', doData.so_id).single();
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

        // Ambil data SO_Items untuk membandingkan Qty Asli vs Qty DO
        const { data: soItemsOriginal } = await supabase.from('sales_order_items').select('id, qty').eq('so_id', doData.so_id);
        if (soItemsOriginal) {
          soItemsOriginal.forEach((item: any) => {
             soItemsDataMap[item.id] = item.qty;
          });
        }
      }

      if (doData.address_id) {
        const { data: addrData } = await supabase.from('customer_addresses').select('*').eq('id', doData.address_id).single();
        setShippingAddress(addrData);
      }

      const { data: itemsData, error: iErr } = await supabase
        .from('delivery_order_items')
        .select(`
          id, qty_delivered, so_item_id,
          sales_order_items (
            products ( part_code, part_name, unit, remark )
          )
        `)
        .eq('do_id', id);

      if (iErr) throw iErr;
      setItems(itemsData || []);

      // ── ALGORITMA DETEKSI PARTIAL ──
      // Cek apakah ada barang yang qty_delivered-nya kurang dari qty asli di SO
      let isPartial = false;
      if (itemsData) {
         for (const item of itemsData) {
            const originalQty = soItemsDataMap[item.so_item_id] || 0;
            if (item.qty_delivered < originalQty) {
               isPartial = true;
               break; // Langsung berhenti kalau ketemu satu saja yang kurang
            }
         }
      }
      setIsPartialDelivery(isPartial);

    } catch (error) {
      console.error('Gagal memuat data:', error);
      alert('Data Surat Jalan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const totalQty = items.reduce((sum, item) => sum + (item.qty_delivered || 0), 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold animate-pulse">Menyiapkan dokumen pengiriman...</p>
    </div>
  );
  
  if (!deliveryOrder) return (
    <div className="card-modern max-w-xl mx-auto p-10 text-center mt-10">
      <h3 className="text-lg font-bold text-rose-600 mb-2">Dokumen Tidak Ditemukan</h3>
      <p className="text-slate-500 mb-6">Surat Jalan yang Anda cari tidak ada atau telah dihapus.</p>
      <Link href="/dashboard/delivery-orders" className="btn-secondary inline-flex">Kembali ke Daftar DO</Link>
    </div>
  );

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
              {/* BADGE DINAMIS BERDASARKAN ALGORITMA */}
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
            minHeight: '297mm',     
            padding: '36px 48px', 
            fontFamily: "Arial, Helvetica, sans-serif", 
            fontSize: 12,
            color: '#000'
          }}
        >

          {/* WATERMARK PARTIAL */}
          {isPartialDelivery && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[8px] border-slate-300 text-slate-300 px-8 py-2 rounded-3xl text-7xl font-black uppercase tracking-widest opacity-20 transform -rotate-[25deg] pointer-events-none z-50 print:opacity-[0.1]">
              PARTIAL
            </div>
          )}

          {/* ===== HEADER ===== */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 85, height: 85, flexShrink: 0 }}>
                <img src="/logo1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#000', marginBottom: 4, letterSpacing: 0.5 }}>CV HARMONISINDO JAYA PART</div>
                <div style={{ fontSize: 10, color: '#000', lineHeight: 1.5 }}>
                  SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman<br />
                  Kav. 28, Kelurahan Tanjung Duren Selatan<br />
                  Kec. Grogol Petamburan, Jakarta Barat
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>DELIVERY ORDER</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{deliveryOrder.do_number}</div>
              <div style={{ fontSize: 11, marginBottom: 4 }}>
                {new Date(deliveryOrder.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 10, color: '#444', fontWeight: 'bold' }}>REF PO: {salesOrder?.po_number?.toUpperCase() || '-'}</div>
            </div>
          </div>

          {/* ===== ALAMAT TO & KIRIM KE ===== */}
          <div style={{ marginBottom: 24, fontSize: 11 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: 45, verticalAlign: 'top' }}>To</td>
                  <td style={{ width: 15, verticalAlign: 'top' }}>:</td>
                  <td style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{customer?.company_name}</td>
                </tr>
                <tr>
                  <td></td><td></td>
                  <td style={{ paddingBottom: 6, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {billingAddress?.complete_address || shippingAddress?.complete_address || '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>Attn</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td style={{ paddingBottom: 16 }}>
                    {billingAddress?.pic_name || shippingAddress?.pic_name || '-'}
                    {billingAddress?.pic_phone ? ` (${billingAddress.pic_phone})` : shippingAddress?.pic_phone ? ` (${shippingAddress.pic_phone})` : ''}
                  </td>
                </tr>

                <tr>
                  <td style={{ verticalAlign: 'top' }}>Attn</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td style={{ paddingBottom: 6 }}>
                    {shippingAddress?.pic_name || '-'}
                    {shippingAddress?.pic_phone ? ` (${shippingAddress.pic_phone})` : ''}
                  </td>
                </tr>

                <tr>
                  <td colSpan={3} style={{ fontWeight: 700, paddingBottom: 4 }}>Kirim Ke :</td>
                </tr>
                <tr>
                  <td></td><td></td>
                  <td style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{customer?.company_name}</td>
                </tr>
                <tr>
                  <td></td><td></td>
                  <td style={{ lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
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
              <div style={{ height: 86 }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold' }}>Nama jelas &</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold' }}>Stample</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Dikirim oleh,</p>
              <div style={{ height: 86 }} />
              <p style={{ margin: 0, fontSize: 11 }}>........................</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Dibuat oleh,</p>
              <div style={{ height: 86 }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', textDecoration: 'underline' }}>Fatin</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#555' }}>Diketahui oleh,</p>
              <div style={{ height: 86 }} />
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