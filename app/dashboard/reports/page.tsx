'use client';

// Wajib import React untuk Fragment
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdvancedReportsPage() {
  // === STATE LAPORAN UTAMA ===
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('all_sales'); 
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); 
  const [reportData, setReportData] = useState<any[]>([]);

  // === NEW STATE: EXPANDABLE ROWS ===
  // Menyimpan ID SO mana yang sedang dilebarkan (null jika tidak ada)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [trxItems, setTrxItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, company_name').order('company_name');
    if (data) setCustomersList(data);
  };

  const fetchReport = async () => {
    setLoading(true);
    // Tutup baris yang sedang melebar jika user ganti filter
    setExpandedRowId(null); 
    setReportData([]);
    try {
      let query = supabase.from('v_transaction_lifecycle').select('*')
        .gte('so_date', `${startDate}T00:00:00Z`)
        .lte('so_date', `${endDate}T23:59:59Z`);

      if (reportType === 'unpaid') query = query.neq('payment_status', 'Paid');
      else if (reportType === 'partial_do') query = query.in('delivery_status', ['Processing', 'Partial']);

      if (selectedCustomerId !== '') query = query.eq('customer_id', selectedCustomerId);

      const { data, error } = await query.order('so_date', { ascending: true });
      if (error) throw error;
      setReportData(data || []);
    } catch (error: any) {
      alert(`Gagal memuat data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // === NEW FUNGSI: HANDLE EXPAND ROW ===
  const handleRowClick = async (soId: string) => {
    // Logika Toggle: Jika diklik baris yang sama, maka tutup.
    if (expandedRowId === soId) {
      setExpandedRowId(null);
      setTrxItems([]);
      return;
    }

    // Lebarkan baris baru
    setExpandedRowId(soId);
    setTrxItems([]); // bersihkan data lama sementara loading
    setItemsLoading(true);

    try {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`qty, unit_price, total_price, products ( part_code, part_name, unit )`)
        .eq('so_id', soId);
      
      if (error) throw error;
      setTrxItems(data || []);
    } catch (error) {
      console.error('Gagal menarik detail', error);
    } finally {
      setItemsLoading(false);
    }
  };

  const exportCSV = () => {
    // Tambahkan 'No. DO' ke dalam header
    const headers = ['Tanggal', 'Klien', 'No. PO', 'No. SO', 'No. DO', 'Status Kirim', 'Invoice', 'Status Bayar', 'Total', 'Terbayar', 'Sisa'];
    
    const rows = reportData.map(item => [
      new Date(item.so_date).toLocaleDateString('id-ID'), 
      `"${item.company_name}"`, 
      item.po_number || '-', 
      item.so_number,
      `"${item.do_numbers}"`, // Tambahkan data do_numbers (dibungkus kutip ganda agar koma tidak merusak kolom Excel)
      item.delivery_status, 
      item.invoice_number, 
      item.payment_status, 
      item.total_order_value, 
      item.total_paid_amount, 
      (item.total_order_value - item.total_paid_amount)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Transaksi.csv`;
    link.click();
  };

  const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Pusat Laporan Eksekutif</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Jenis Laporan</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border-2 p-2.5 rounded-lg text-sm font-semibold outline-none focus:border-blue-500">
              <option value="all_sales">Semua Transaksi</option>
              <option value="unpaid">Piutang (Belum Lunas)</option>
              <option value="partial_do">Backorder (Belum Terkirim)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Pilih Klien</label>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full border-2 p-2.5 rounded-lg text-sm font-bold text-blue-600 outline-none focus:border-blue-500">
              <option value="">-- Semua Klien --</option>
              {customersList.map(cust => (<option key={cust.id} value={cust.id}>{cust.company_name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Mulai</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border-2 p-2.5 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Sampai</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border-2 p-2.5 rounded-lg text-sm" />
          </div>
          <button onClick={fetchReport} disabled={loading} className="bg-blue-600 text-white p-2.5 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300">
            {loading ? 'Menarik...' : 'Tampilkan Laporan'}
          </button>
        </div>
      </div>

      {/* TABLE UTAMA DENGAN EXPANDABLE ROWS */}
      {reportData.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <span className="font-bold text-gray-700">Ditemukan {reportData.length} dokumen. <span className="text-blue-600 text-xs">(Klik baris untuk melebarkan detail barang)</span></span>
            <button onClick={exportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700">📥 Download CSV</button>
          </div>
          <div className="overflow-x-auto max-h-[65vh] custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-100 font-bold text-gray-600 uppercase text-[10px] sticky top-0 z-20 shadow-inner">
                <tr>
                  <th className="p-4 border-b w-10"></th> {/* Kolom Indikator */}
                  <th className="p-4 border-b">Tanggal</th>
                  <th className="p-4 border-b">Klien / PT</th>
                  <th className="p-4 border-b">No. SO / PO</th>
                  <th className="p-4 border-b">Pengiriman</th>
                  <th className="p-4 border-b">Tagihan & Status</th>
                  <th className="p-4 border-b text-right">Nilai & Sisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((item) => {
                  const balance = item.total_order_value - item.total_paid_amount;
                  const isExpanded = expandedRowId === item.so_id;
                  
                  return (
                    // Gunakan React.Fragment karena 1 data menghasilkan 2 baris (Main + Detail)
                    <React.Fragment key={item.so_id}>
                      
                      {/* BARIS UTAMA (Bisa Diklik) */}
                      <tr 
                        onClick={() => handleRowClick(item.so_id)} 
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="p-4 text-center font-bold text-xs text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </td>
                        <td className="p-4 text-gray-600">{new Date(item.so_date).toLocaleDateString('id-ID')}</td>
                        <td className="p-4 font-bold text-gray-900 uppercase">{item.company_name}</td>
                        <td className="p-4">
                          <div className="font-bold text-blue-700">{item.so_number}</div>
                          <div className="font-mono text-[10px] text-gray-500">PO: {item.po_number || '-'}</div>
                        </td>
                        <td className="p-4">
                            {/* Menampilkan Status Kirim (Badge) */}
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase mb-1 inline-block ${item.delivery_status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {item.delivery_status}
                            </span>
                            {/* Menampilkan Daftar Nomor DO di bawahnya */}
                            <div className="font-mono text-xs text-gray-600 font-semibold truncate max-w-[150px]" title={item.do_numbers}>
                                {item.do_numbers}
                            </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-bold text-gray-700">{item.invoice_number}</div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : item.payment_status === 'Partial' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {item.payment_status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-black text-gray-950">{fmtRp(item.total_order_value)}</div>
                          {balance > 0 && <div className="text-[10px] font-bold text-red-500">Sisa: {fmtRp(balance)}</div>}
                        </td>
                      </tr>

                      {/* BARIS DETAIL (SUB-TABLE) - Muncul jika isExpanded=true */}
                      {isExpanded && (
                        <tr>
                          {/* Colspan 7 untuk menutupi seluruh lebar tabel utama */}
                          <td colSpan={7} className="p-0 border-b bg-gray-50/50">
                            {/* Beri padding & indentasi agar terlihat menjorok ke dalam */}
                            <div className="p-5 pl-14 space-y-3 border-l-4 border-blue-500 shadow-inner">
                              <h4 className="font-bold text-slate-700 text-sm">Rincian Barang untuk {item.so_number}</h4>
                              
                              {itemsLoading ? (
                                <div className="p-5 text-center text-xs text-gray-500 font-bold">Memuat rincian barang...</div>
                              ) : trxItems.length === 0 ? (
                                <div className="p-5 text-center text-xs text-gray-400 border border-dashed rounded-lg">Tidak ada rincian barang untuk transaksi ini.</div>
                              ) : (
                                // TABEL KECIL (SUB-TABLE)
                                <table className="w-full text-xs bg-white rounded-lg border shadow-sm overflow-hidden">
                                  <thead className="bg-gray-100 font-bold text-[10px] text-gray-500 uppercase">
                                    <tr>
                                      <th className="p-3 border-b">Part Number</th>
                                      <th className="p-3 border-b">Deskripsi Barang</th>
                                      <th className="p-3 border-b text-center">Qty</th>
                                      <th className="p-3 border-b text-right">Harga Satuan</th>
                                      <th className="p-3 border-b text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {trxItems.map((subItem, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono font-bold text-blue-800">{subItem.products?.part_code}</td>
                                        <td className="p-3 font-semibold text-gray-800">{subItem.products?.part_name}</td>
                                        <td className="p-3 text-center font-bold">{subItem.qty} {subItem.products?.unit}</td>
                                        <td className="p-3 text-right text-gray-600">{fmtRp(subItem.unit_price)}</td>
                                        <td className="p-3 text-right font-black text-gray-950">{fmtRp(subItem.total_price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}