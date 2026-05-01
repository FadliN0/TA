'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchQuotationData();
  }, [id]);

  const fetchQuotationData = async () => {
    setLoading(true);
    try {
      const { data: quoteData, error: qErr } = await supabase.from('quotations').select('*').eq('id', id).single();
      if (qErr) throw qErr;
      setQuotation(quoteData);

      if (quoteData.customer_id) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', quoteData.customer_id).single();
        setCustomer(custData);
      }

      if (quoteData.address_id) {
        const { data: addrData } = await supabase.from('customer_addresses').select('*').eq('id', quoteData.address_id).single();
        setAddress(addrData);
      }

      const { data: itemsData, error: iErr } = await supabase
        .from('quotation_items')
        .select(`*, products ( part_code, part_name, unit, remark )`)
        .eq('quotation_id', id);

      if (iErr) throw iErr;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Gagal memuat data:', error);
      alert('Data tidak ditemukan atau terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleUpdateStatus = async (newStatus: string) => {
    const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', id);
    if (!error) setQuotation({ ...quotation, status: newStatus });
  };

  const getValidityDays = () => {
    if (!quotation?.created_at || !quotation?.valid_until) return 0;
    const start = new Date(quotation.created_at).getTime();
    const end = new Date(quotation.valid_until).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const [isCreatingSO, setIsCreatingSO] = useState(false);

  const handleCreateSO = async () => {
    // Karena po_number di database kamu NOT NULL, kita WAJIB meminta input PO dari customer
    const poInput = window.prompt('Masukkan Nomor PO (Purchase Order) dari Klien untuk melanjutkan:');

    // Jika admin menekan "Cancel" atau membiarkan kosong, batalkan proses
    if (poInput === null || poInput.trim() === '') {
      alert('Pembuatan Sales Order dibatalkan. Nomor PO dari klien wajib diisi!');
      return;
    }
    
    setIsCreatingSO(true);
    try {
      // 1. Generate SO Number Otomatis (SO-HJP-202604-001)
      const today = new Date();
      const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `SO-HJP-${yearMonth}-`;

      const { data: lastDoc } = await supabase
        .from('sales_orders')
        .select('so_number')
        .like('so_number', `${prefix}%`)
        .order('so_number', { ascending: false })
        .limit(1);
      
      let nextSeq = 1;
      if (lastDoc && lastDoc.length > 0) {
        const lastNum = lastDoc[0].so_number;
        const lastPart = lastNum.split('-').pop();
        nextSeq = parseInt(lastPart || '0') + 1;
      }
      const newSoNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

      // 2. Insert Data ke Tabel sales_orders (Sesuai persis dengan skema SQL kamu)
      const { data: so, error: soErr } = await supabase.from('sales_orders').insert([{
        so_number: newSoNumber,
        quotation_id: id,            // Relasi ke Quotation ini
        po_number: poInput.trim(),   // WAJIB ADA (NOT NULL)
        customer_id: quotation.customer_id,
        address_id: quotation.address_id,
        grand_total: quotation.grand_total,
        status: 'Open'
        // Tidak ada kolom 'notes' di tabel SO kamu, jadi kita tidak masukkan
      }]).select().single();

      if (soErr) throw soErr;

      // 3. Gandakan (Copy-Paste) Semua Item ke sales_order_items
      const itemsToInsert = items.map(i => ({
        so_id: so.id,
        product_id: i.product_id,
        qty: i.qty,
        unit_price: i.unit_price,
        discount: i.discount,
        total_price: i.total_price,
      }));

      const { error: itemErr } = await supabase.from('sales_order_items').insert(itemsToInsert);
      if (itemErr) throw itemErr;

      alert(`Sukses! Dokumen Sales Order ${newSoNumber} berhasil diterbitkan dengan Referensi PO: ${poInput.trim()}`);
      router.push('/dashboard/sales-orders'); // Arahkan ke halaman daftar SO
      
    } catch (error: any) {
      console.error(error);
      alert(`Gagal membuat SO: ${error.message}`);
    } finally {
      setIsCreatingSO(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Menarik data dokumen...</div>;
  if (!quotation) return <div className="p-8 text-center text-red-500">Dokumen tidak ditemukan.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none text-black">

      {/* ── KONTROL UI ── */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <Link href="/dashboard/quotations" className="text-sm font-bold text-gray-500 hover:text-blue-600">← Kembali</Link>
        <div className="flex items-center gap-3">
          <select
            value={quotation.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className={`text-sm font-bold border rounded-md px-3 py-2 outline-none
              ${quotation.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                quotation.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                quotation.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            <option value="Draft">Status: Draft</option>
            <option value="Sent">Status: Dikirim (Sent)</option>
            <option value="Approved">Status: Disetujui (Approved)</option>
            <option value="Rejected">Status: Ditolak (Rejected)</option>
          </select>
          {quotation.status === 'Approved' && (
            <button 
              onClick={handleCreateSO}
              disabled={isCreatingSO}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2 disabled:bg-green-300 transition-colors"
            >
              {isCreatingSO ? 'Memproses...' : '✅ Convert ke Sales Order'}
            </button>
          )}
          <Link href={`/dashboard/quotations/${id}/edit`} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2">
            ✏️ Revisi Dokumen
          </Link>
          <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold text-sm shadow flex items-center gap-2">
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* ── KERTAS DOKUMEN A4 ── */}
      <div className="bg-white rounded-xl shadow-sm print:shadow-none print:rounded-none print:p-0" style={{ padding: '40px 48px', fontFamily: "'Noto Sans', Arial, sans-serif", fontSize: 11 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 72, height: 72, flexShrink: 0 }}>
              <img src="/logo.png" alt="CV. HJP Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', marginBottom: 2 }}>CV HARMONISINDO JAYA PART</div>
              <div style={{ fontSize: 10, color: '#333', lineHeight: 1.6 }}>
                SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman<br />Kav. 28, Kelurahan Tanjung Duren Selatan<br />Kec. Grogol Petamburan, Jakarta Barat
              </div>
            </div>
          </div>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 28px', borderRadius: 4, alignSelf: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>Sales Quotation</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '12px 0' }} />

        {/* INFO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={tdLabel}>TO</td><td style={tdColon}>:</td><td style={{ ...tdValue, fontWeight: 700 }}>{customer?.company_name}</td></tr>
              <tr><td style={{ ...tdLabel, verticalAlign: 'top' }}>Address</td><td style={{ ...tdColon, verticalAlign: 'top' }}>:</td><td style={{ ...tdValue, whiteSpace: 'pre-wrap' }}>{address?.complete_address}</td></tr>
              <tr><td style={{ ...tdLabel, paddingTop: 6 }}>Telp</td><td style={{ ...tdColon, paddingTop: 6 }}>:</td><td style={{ ...tdValue, paddingTop: 6 }}>({address?.pic_phone || '-'})</td></tr>
              <tr><td style={tdLabel}>Fax</td><td style={tdColon}>:</td><td style={tdValue}>-</td></tr>
            </tbody>
          </table>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={tdLabel}>No</td><td style={tdColon}>:</td><td style={{ ...tdValue, fontWeight: 700 }}>{quotation.quotation_number}</td></tr>
              <tr><td style={tdLabel}>MR / Ref No</td><td style={tdColon}>:</td><td style={{ ...tdValue, fontWeight: 700, color: '#1a3a6b' }}>{quotation.mr_number}</td></tr>
              <tr><td style={tdLabel}>Date</td><td style={tdColon}>:</td><td style={tdValue}>{new Date(quotation.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
              <tr><td style={tdLabel}>Validity</td><td style={tdColon}>:</td><td style={tdValue}>{getValidityDays()} Days</td></tr>
              <tr><td style={{ ...tdLabel, paddingTop: 6 }}>Email</td><td style={{ ...tdColon, paddingTop: 6 }}>:</td><td style={{ ...tdValue, paddingTop: 6 }}>{customer?.email || '-'}</td></tr>
              <tr><td style={tdLabel}>Attn</td><td style={tdColon}>:</td><td style={tdValue}>{address?.pic_name || '-'}</td></tr>
            </tbody>
          </table>
        </div>

        {/* TABEL BARANG */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 28 }} /> 
            <col style={{ width: 95 }} />  
            <col />                        
            <col style={{ width: 28 }} />  
            <col style={{ width: 34 }} />  
            <col style={{ width: 105 }} /> 
            <col style={{ width: 35 }} />  
            <col style={{ width: 105 }} /> 
            <col style={{ width: 65 }} /> 
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Part Number</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle} colSpan={2}>Qty</th>
              <th style={thStyle}>Unit Price</th>
              <th style={thStyle}>Disc</th>
              <th style={thStyle}>Amount (IDR)</th>
              <th style={thStyle}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} style={{ pageBreakInside: 'avoid' }}>
                <td style={{ ...tdItem, textAlign: 'center' }}>{index + 1}</td>
                <td style={{ ...tdItem, fontWeight: 700 }}>{item.products?.part_code}</td>
                <td style={tdItem}>
                  <div style={{ lineHeight: 1.4 }}>{item.products?.part_name}</div>
                </td>
                <td style={{ ...tdItem, textAlign: 'center' }}>{item.qty}</td>
                <td style={{ ...tdItem, textAlign: 'center' }}>{item.products?.unit}</td>
                
                {/* Format Accounting (Flex Space-Between) */}
                <td style={{ ...tdItem, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rp.</span>
                    <span>{item.unit_price?.toLocaleString('id-ID')}</span>
                  </div>
                </td>
                
                {/* Diskon diubah jadi Persentase (%) */}
                <td style={{ ...tdItem, textAlign: 'center' }}>
                  {item.discount > 0 ? `${item.discount}%` : '-'}
                </td>
                
                {/* Format Accounting (Flex Space-Between) */}
                <td style={{ ...tdItem, whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rp.</span>
                    <span>{item.total_price?.toLocaleString('id-ID')}</span>
                  </div>
                </td>
                
                <td style={{ ...tdItem, textAlign: 'center' }}>
                  {item.products?.remark || '-'}
                </td>
              </tr>
            ))}

            {/* Baris Total */}
            <tr style={{ pageBreakInside: 'avoid', background: '#f5f5f5' }}>
              <td colSpan={7} style={{ ...tdItem, textAlign: 'right', fontWeight: 700 }}>Total</td>
              <td style={{ ...tdItem, fontWeight: 700, whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rp.</span>
                  <span>{quotation.grand_total?.toLocaleString('id-ID')}</span>
                </div>
              </td>
              <td style={tdItem}></td>
            </tr>
          </tbody>
        </table>

        {/* CATATAN (Dinamis dari Notes) */}
        <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
          <p style={{ margin: '2px 0', fontWeight: 700, textDecoration: 'underline' }}>NOTE :</p>
          <div style={{ whiteSpace: 'pre-wrap', margin: '4px 0', fontSize: 11, lineHeight: 1.4 }}>
            {quotation.notes ? quotation.notes : "Ready Stock\nFranco Site"}
          </div>
          <p style={{ margin: '8px 0 2px', fontWeight: 700, color: '#b00000', fontStyle: 'italic' }}>
            All payment to Bank MANDIRI No. 1560024959530 a.n CV HARMONISINDO JAYA PART
          </p>
        </div>

        {/* TANDA TANGAN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11 }}>Quote by,</p>
            <div style={{ height: 60 }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline' }}>Fatin</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 11 }}>Approved by,</p>
            <div style={{ height: 60 }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline' }}>
              {address?.pic_name || '................................'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Style helpers ─── */
const tdBase: React.CSSProperties = { padding: '2px 0', verticalAlign: 'top', fontSize: 11 };
const tdLabel: React.CSSProperties = { ...tdBase, fontWeight: 700, width: 52, whiteSpace: 'nowrap' };
const tdColon: React.CSSProperties = { ...tdBase, width: 8 };
const tdValue: React.CSSProperties = { ...tdBase };
const thStyle: React.CSSProperties = { border: '1px solid #444', padding: '5px 6px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11 };
const tdItem: React.CSSProperties = { border: '1px solid #444', padding: '5px 6px', fontSize: 11, verticalAlign: 'middle' };