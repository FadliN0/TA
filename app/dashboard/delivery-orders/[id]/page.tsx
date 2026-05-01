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

  useEffect(() => {
    fetchDOData();
  }, [id]);

  const fetchDOData = async () => {
    setLoading(true);
    try {
      const { data: doData, error: doErr } = await supabase.from('delivery_orders').select('*').eq('id', id).single();
      if (doErr) throw doErr;
      setDeliveryOrder(doData);

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
      }

      if (doData.address_id) {
        const { data: addrData } = await supabase.from('customer_addresses').select('*').eq('id', doData.address_id).single();
        setShippingAddress(addrData);
      }

      const { data: itemsData, error: iErr } = await supabase
        .from('delivery_order_items')
        .select(`
          id, qty_delivered,
          sales_order_items (
            products ( part_code, part_name, unit, remark )
          )
        `)
        .eq('do_id', id);

      if (iErr) throw iErr;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Gagal memuat data:', error);
      alert('Data Surat Jalan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const totalQty = items.reduce((sum, item) => sum + (item.qty_delivered || 0), 0);

  if (loading) return <div className="p-8 text-center text-gray-500">Menyiapkan dokumen Surat Jalan...</div>;
  if (!deliveryOrder) return <div className="p-8 text-center text-red-500">Dokumen tidak ditemukan.</div>;

  // REVISI: Minimal 7 baris. Akan bertambah otomatis jika item > 7
  const MIN_ROWS = 7;
  const emptyRowsCount = Math.max(0, MIN_ROWS - items.length);

  return (
    <div className="max-w-4xl mx-auto space-y-4 print:m-0 print:p-0 print:max-w-none text-black">

      {/* ── KONTROL UI ── */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <Link href="/dashboard/delivery-orders" className="text-sm font-bold text-gray-500 hover:text-teal-600">
          ← Kembali ke Daftar DO
        </Link>
        <button
          onClick={handlePrint}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2"
        >
          🖨️ Cetak Surat Jalan
        </button>
      </div>

      {/* ── KERTAS DOKUMEN A4 ── */}
      <div className="bg-white print:shadow-none print:rounded-none" style={{ padding: '36px 48px', fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12, color: '#000' }}>

        {/* ===== HEADER ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 85, height: 85, flexShrink: 0 }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>DELIVERY ORDER</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{deliveryOrder.do_number}</div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>
              {new Date(deliveryOrder.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11 }}>{salesOrder?.po_number?.toLowerCase() || '-'}</div>
          </div>
        </div>

        {/* ===== ALAMAT TO & KIRIM KE (VERTIKAL + ATTN SHIPPING) ===== */}
        <div style={{ marginBottom: 24, fontSize: 11 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {/* TO (Billing) */}
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
                  {billingAddress?.pic_phone ? `(${billingAddress.pic_phone})` : shippingAddress?.pic_phone ? `(${shippingAddress.pic_phone})` : ''}
                </td>
              </tr>

              {/* ATTN SHIPPING (Diletakkan di atas Kirim Ke sesuai permintaan) */}
              <tr>
                <td style={{ verticalAlign: 'top' }}>Attn</td>
                <td style={{ verticalAlign: 'top' }}>:</td>
                <td style={{ paddingBottom: 6 }}>
                  {shippingAddress?.pic_name || '-'}
                  {shippingAddress?.pic_phone ? `(${shippingAddress.pic_phone})` : ''}
                </td>
              </tr>

              {/* KIRIM KE (Shipping) */}
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
                  <td style={tdItem}>{product?.part_code || '-'}</td>
                  <td style={{ ...tdItem, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {product?.part_name || '-'}
                  </td>
                  <td style={{ ...tdItem, textAlign: 'center' }}>{item.qty_delivered}</td>
                  <td style={{ ...tdItem, textAlign: 'center' }}>{product?.unit || 'PCS'}</td>
                  <td style={{ ...tdItem, textAlign: 'center' }}>
                    {product?.remark || '-'}
                  </td>
                </tr>
              );
            })}

            {/* Baris kosong pembentuk tinggi minimal tabel (7 baris) */}
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

            {/* Baris Total */}
            <tr>
              <td colSpan={3} style={{ ...tdItem, textAlign: 'right' }}>Total :</td>
              <td style={{ ...tdItem, textAlign: 'center', fontWeight: 700 }}>{totalQty}</td>
              <td style={tdItem}></td>
              <td style={tdItem}></td>
            </tr>
          </tbody>
        </table>

        {/* ===== TANDA TANGAN ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, pageBreakInside: 'avoid', marginTop: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11 }}>Receipt By,</p>
            <div style={{ height: 86 }} />
            <p style={{ margin: 0, fontSize: 11 }}>Nama jelas &</p>
            <p style={{ margin: 0, fontSize: 11 }}>Stample</p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11 }}>Dikirim oleh,</p>
            <div style={{ height: 86 }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11 }}>Dibuat oleh,</p>
            <div style={{ height: 86 }} />
            <p style={{ margin: 0, fontSize: 11 }}>Fatin</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11 }}>Diketahui oleh,</p>
            <div style={{ height: 86 }} />
            <p style={{ margin: 0, fontSize: 11 }}>Hana Khamila</p>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Style helpers ─── */
const thStyle: React.CSSProperties = { border: '1px solid #000', padding: '8px 6px', textAlign: 'center', background: '#fff', fontSize: 11, fontWeight: 'normal' };
const tdItem: React.CSSProperties = { border: '1px solid #000', padding: '6px 8px', fontSize: 11, verticalAlign: 'middle', color: '#000' };