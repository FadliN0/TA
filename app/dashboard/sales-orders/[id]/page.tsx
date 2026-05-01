'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // State untuk tombol Surat Jalan
  const [isCreatingDO, setIsCreatingDO] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  useEffect(() => {
    fetchSalesOrderData();
  }, [id]);

  const fetchSalesOrderData = async () => {
    setLoading(true);
    try {
      const { data: soData, error: soErr } = await supabase.from('sales_orders').select('*').eq('id', id).single();
      if (soErr) throw soErr;
      setSalesOrder(soData);

      if (soData.customer_id) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', soData.customer_id).single();
        setCustomer(custData);
      }

      if (soData.address_id) {
        const { data: addrData } = await supabase.from('customer_addresses').select('*').eq('id', soData.address_id).single();
        setAddress(addrData);
      }

      const { data: itemsData, error: iErr } = await supabase
        .from('sales_order_items')
        .select(`*, products ( part_code, part_name, unit, remark )`)
        .eq('so_id', id);

      if (iErr) throw iErr;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Gagal memuat data:', error);
      alert('Data dokumen Sales Order tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleUpdateStatus = async (newStatus: string) => {
    // Keamanan ekstra: Pastikan frontend menolak update manual ke Completed
    if (newStatus === 'Completed') {
      alert('Status Completed hanya bisa diubah otomatis oleh sistem ketika semua Surat Jalan (DO) sudah terkirim!');
      return;
    }

    const { error } = await supabase.from('sales_orders').update({ status: newStatus }).eq('id', id);
    if (!error) setSalesOrder({ ...salesOrder, status: newStatus });
  };

  // --- FUNGSI GENERATE DO ---
  const handleCreateDO = () => {
    // Arahkan ke halaman pembuatan DO khusus dengan membawa parameter so_id
    router.push(`/dashboard/delivery-orders/create?so_id=${id}`);
  };

  // --- FUNGSI GENERATE INVOICE VIA POSTGRES PROCEDURE ---
  const handleCreateInvoice = async () => {
    const confirm = window.confirm('Buat Invoice Penagihan resmi untuk pesanan ini?');
    if (!confirm) return;
    
    setIsCreatingInvoice(true);
    try {
      // 1. Generate Invoice Number Otomatis (Contoh: INV-HJP-202604-001)
      const today = new Date();
      const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `INV-HJP-${yearMonth}-`;

      const { data: lastDoc } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);
      
      let nextSeq = 1;
      if (lastDoc && lastDoc.length > 0) {
        const lastNum = lastDoc[0].invoice_number;
        const lastPart = lastNum.split('-').pop();
        nextSeq = parseInt(lastPart || '0') + 1;
      }
      const newInvNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

      // 2. Set Tanggal Jatuh Tempo (Default 30 Hari dari sekarang)
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30);
      const formattedDueDate = dueDate.toISOString().split('T')[0];

      // 3. EKSEKUSI STORED PROCEDURE DI POSTGRESQL!
      // Memanggil fungsi generate_full_invoice_from_so yang sudah kamu buat
      const { error: rpcError } = await supabase.rpc('generate_full_invoice_from_so', {
        p_so_id: id,
        p_inv_number: newInvNumber,
        p_due_date: formattedDueDate,
        p_creator_id: null // Bisa diisi UUID User Login jika sistem Auth sudah di-hook sepenuhnya
      });

      if (rpcError) throw rpcError;

      alert(`Luar biasa! Invoice ${newInvNumber} berhasil digenerate oleh Database.`);
      
      // Arahkan admin ke halaman daftar Invoice
      router.push(`/dashboard/invoices`); 

    } catch (error: any) {
      console.error(error);
      alert(`Gagal membuat Invoice: ${error.message}`);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Menyiapkan dokumen pesanan...</div>;
  if (!salesOrder) return <div className="p-8 text-center text-red-500">Dokumen tidak ditemukan.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none text-black">

      {/* ── KONTROL UI ── */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <Link href="/dashboard/sales-orders" className="text-sm font-bold text-gray-500 hover:text-blue-600">
          ← Kembali ke Daftar SO
        </Link>
        <div className="flex items-center gap-3">
          
          {/* PERBAIKAN ANOMALI STATUS: Kunci jika sudah Completed */}
          <select
            value={salesOrder.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            disabled={salesOrder.status === 'Completed'}
            className={`text-sm font-bold border rounded-md px-3 py-2 outline-none
              ${salesOrder.status === 'Open'       ? 'bg-blue-100 text-blue-700'  :
                salesOrder.status === 'Processing' ? 'bg-orange-100 text-orange-700'  :
                salesOrder.status === 'Completed'  ? 'bg-green-100 text-green-700 opacity-80 cursor-not-allowed':
                                                     'bg-red-100 text-red-700'}`}
          >
            <option value="Open">Status: Open (Masuk)</option>
            <option value="Processing">Status: Processing (Disiapkan)</option>
            {/* Opsi Completed hanya muncul jika sistem (Trigger) sudah mengubahnya */}
            {salesOrder.status === 'Completed' && (
              <option value="Completed">Status: Completed (Otomatis Selesai)</option>
            )}
            <option value="Cancelled">Status: Cancelled (Dibatalkan)</option>
          </select>

          {salesOrder.status !== 'Cancelled' && (
            <button
              onClick={handleCreateInvoice}
              disabled={isCreatingInvoice}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2 disabled:bg-purple-300 transition-colors"
            >
              {isCreatingInvoice ? 'Memproses...' : '💰 Buat Tagihan (Invoice)'}
            </button>
          )}

          {/* Tombol Buat DO: Sembunyikan jika SO Dibatalkan atau Sudah Selesai Total */}
          {salesOrder.status !== 'Cancelled' && salesOrder.status !== 'Completed' && (
            <button
              onClick={handleCreateDO}
              disabled={isCreatingDO}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2 disabled:bg-teal-300 transition-colors"
            >
              {isCreatingDO ? 'Memproses...' : '🚚 Buat Surat Jalan (DO)'}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2"
          >
            🖨️ Cetak Sales Order
          </button>
        </div>
      </div>

      {/* ── KERTAS DOKUMEN A4 ── */}
      <div className="bg-white rounded-xl shadow-sm print:shadow-none print:rounded-none print:p-0" style={{ padding: '40px 48px', fontFamily: "'Noto Sans', Arial, sans-serif", fontSize: 11 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 80, height: 80, flexShrink: 0 }}>
              <img src="/logo.png" alt="CV. HJP Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2c3e50', textTransform: 'uppercase', marginBottom: 4 }}>CV HARMONISINDO JAYA PART</div>
              <div style={{ fontSize: 10, color: '#444', lineHeight: 1.5 }}>
                SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman<br />Kav. 28, Kelurahan Tanjung Duren Selatan<br />Kec. Grogol Petamburan, Jakarta Barat
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: '#2c3e50', color: '#fff', padding: '10px 28px', borderRadius: 4, display: 'inline-block' }}>
              <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>SALES ORDER</span>
            </div>
            <p style={{ fontSize: 10, color: '#555', marginTop: 6, fontWeight: 'bold' }}>( ORDER CONFIRMATION )</p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #2c3e50', margin: '20px 0 16px' }} />

        {/* INFO: Tujuan & Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '0 24px', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup><col style={{ width: 70 }} /><col style={{ width: 15 }} /><col /></colgroup>
            <tbody>
              <tr><td style={tdLabel}>ORDER BY</td><td style={tdColon}>:</td><td style={{ ...tdValue, fontWeight: 900, fontSize: 12 }}>{customer?.company_name}</td></tr>
              <tr><td style={{ ...tdLabel, verticalAlign: 'top', paddingTop: 6 }}>SHIP TO</td><td style={{ ...tdColon, verticalAlign: 'top', paddingTop: 6 }}>:</td><td style={{ ...tdValue, paddingTop: 6, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }}>{address?.complete_address}</td></tr>
              <tr><td style={{ ...tdLabel, paddingTop: 8 }}>ATTN</td><td style={{ ...tdColon, paddingTop: 8 }}>:</td><td style={{ ...tdValue, paddingTop: 8, fontWeight: 800 }}>{address?.pic_name || '-'} ({address?.pic_phone || '-'})</td></tr>
            </tbody>
          </table>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={tdLabel}>SO No.</td><td style={tdColon}>:</td><td style={{ ...tdValue, fontWeight: 900, fontSize: 12 }}>{salesOrder.so_number}</td></tr>
              <tr><td style={{ ...tdLabel, paddingTop: 6 }}>Date</td><td style={{ ...tdColon, paddingTop: 6 }}>:</td><td style={{ ...tdValue, paddingTop: 6 }}>{new Date(salesOrder.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
              <tr>
                <td colSpan={3} style={{ paddingTop: 16 }}>
                  <div style={{ background: '#f8f9fa', border: '1px solid #ccc', padding: '8px 12px', borderRadius: 6 }}>
                    <span style={{ fontSize: 10, color: '#666', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>CUSTOMER P.O NUMBER :</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#d35400', display: 'block' }}>{salesOrder.po_number || 'TIDAK ADA PO'}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL BARANG */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 32 }} /> <col style={{ width: 110 }} /> <col /> <col style={{ width: 30 }} /> <col style={{ width: 35 }} /> <col style={{ width: 100 }} /> <col style={{ width: 40 }} /> <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>No</th><th style={thStyle}>Part Number</th><th style={thStyle}>Description</th><th style={thStyle} colSpan={2}>Qty</th><th style={thStyle}>Unit Price</th><th style={thStyle}>Disc</th><th style={thStyle}>Total (IDR)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} style={{ pageBreakInside: 'avoid' }}>
                <td style={{ ...tdItem, textAlign: 'center' }}>{index + 1}</td>
                <td style={{ ...tdItem, fontWeight: 800 }}>{item.products?.part_code}</td>
                <td style={{ ...tdItem, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  <div style={{ lineHeight: 1.4, fontWeight: 800 }}>{item.products?.part_name}</div>
                  {item.products?.remark && <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 2 }}>({item.products.remark})</div>}
                  {item.item_note && <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 2 }}>({item.item_note})</div>}
                </td>
                <td style={{ ...tdItem, textAlign: 'center', fontWeight: 900, fontSize: 12 }}>{item.qty}</td>
                <td style={{ ...tdItem, textAlign: 'center' }}>{item.products?.unit}</td>
                <td style={{ ...tdItem, whiteSpace: 'nowrap' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600 }}>Rp</span><span>{item.unit_price?.toLocaleString('id-ID')}</span></div></td>
                <td style={{ ...tdItem, textAlign: 'center' }}>{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                <td style={{ ...tdItem, whiteSpace: 'nowrap', fontWeight: 900 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rp</span><span>{item.total_price?.toLocaleString('id-ID')}</span></div></td>
              </tr>
            ))}
            <tr style={{ pageBreakInside: 'avoid' }}>
              <td colSpan={7} style={{ ...tdItem, textAlign: 'right', fontWeight: 900, fontSize: 12, paddingRight: 16, borderTop: '2px solid #ccc' }}>GRAND TOTAL</td>
              <td style={{ ...tdItem, fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap', color: '#2c3e50', borderTop: '2px solid #ccc', background: '#f8f9fa' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rp</span><span>{salesOrder.grand_total?.toLocaleString('id-ID')}</span></div></td>
            </tr>
          </tbody>
        </table>

        {/* INTERNAL NOTES & INSTRUCTIONS */}
        <div style={{ marginBottom: 40, pageBreakInside: 'avoid' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 10, background: '#f1f1f1', display: 'inline-block', padding: '4px 10px', borderRadius: '4px 4px 0 0' }}>INTERNAL REMARKS / INSTRUCTIONS :</p>
          <div style={{ border: '1px dashed #ccc', padding: '12px', minHeight: '60px', fontSize: 11, fontStyle: 'italic', color: '#555', borderRadius: '0 4px 4px 4px' }}>
            {salesOrder.notes || "Harap diproses sesuai standard operasi perusahaan. Segera terbitkan Surat Jalan (Delivery Order) jika barang sudah siap."}
          </div>
        </div>

        {/* TANDA TANGAN INTERNAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center', width: '25%' }}><p style={{ margin: 0, fontSize: 10, color: '#666' }}>Prepared By,</p><div style={{ height: 70 }} /><p style={{ margin: 0, fontSize: 11, fontWeight: 800, textDecoration: 'underline' }}>Tim Admin Sales</p><p style={{ margin: 0, fontSize: 9, color: '#999', marginTop: 4 }}>Date: ........................</p></div>
          <div style={{ textAlign: 'center', width: '25%' }}><p style={{ margin: 0, fontSize: 10, color: '#666' }}>Authorized By,</p><div style={{ height: 70 }} /><p style={{ margin: 0, fontSize: 11, fontWeight: 800, textDecoration: 'underline' }}>..........................................</p><p style={{ margin: 0, fontSize: 9, color: '#999', marginTop: 4 }}>Sales Manager / Director</p></div>
          <div style={{ textAlign: 'center', width: '25%' }}><p style={{ margin: 0, fontSize: 10, color: '#666' }}>Checked By (Warehouse),</p><div style={{ height: 70 }} /><p style={{ margin: 0, fontSize: 11, fontWeight: 800, textDecoration: 'underline' }}>..........................................</p><p style={{ margin: 0, fontSize: 9, color: '#999', marginTop: 4 }}>Kepala Gudang</p></div>
        </div>

      </div>
    </div>
  );
}

/* ─── Style helpers ─── */
const tdBase: React.CSSProperties = { padding: '2px 0', verticalAlign: 'top', fontSize: 11 };
const tdLabel: React.CSSProperties = { ...tdBase, fontWeight: 800, whiteSpace: 'nowrap', color: '#555' };
const tdColon: React.CSSProperties = { ...tdBase, width: 12, textAlign: 'center' };
const tdValue: React.CSSProperties = { ...tdBase, color: '#000' };
const thStyle: React.CSSProperties = { border: '1px solid #2c3e50', padding: '8px 6px', textAlign: 'center', background: '#2c3e50', color: '#ffffff', fontWeight: 800, fontSize: 10, textTransform: 'uppercase' };
const tdItem: React.CSSProperties = { border: '1px solid #ccc', padding: '8px 6px', fontSize: 11, verticalAlign: 'middle' };