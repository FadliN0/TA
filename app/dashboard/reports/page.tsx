'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdvancedReportsPage() {
  const router = useRouter();
  
  // === TABS STATE ===
  const [activeTab, setActiveTab] = useState<'transactions' | 'products'>('transactions');

  // ==========================================
  // STATE: MODE LAPORAN TRANSAKSI (SO)
  // ==========================================
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('all_sales'); 
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); 
  const [reportData, setReportData] = useState<any[]>([]);

  // ==========================================
  // STATE: MODE RIWAYAT BARANG
  // ==========================================
  const [productSearch, setProductSearch] = useState('');
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [hasSearchedProduct, setHasSearchedProduct] = useState(false);
  const [selectedProductCustomerId, setSelectedProductCustomerId] = useState(''); // State khusus dropdown di Tab Barang

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, company_name').order('company_name');
    if (data) setCustomersList(data);
  };

  // --- FUNGSI MODE TRANSAKSI ---
  const fetchReport = async () => {
    setLoading(true);
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

  const handleRowClick = (soId: string) => {
    router.push(`/dashboard/reports/${soId}`);
  };

  // --- FUNGSI MODE RIWAYAT BARANG (Diperbarui) ---
  const fetchProductHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validasi: Harus pilih klien atau isi pencarian
    if (!productSearch.trim() && !selectedProductCustomerId) {
      return alert('Silakan pilih Klien atau ketik nama barang untuk mencari!');
    }
    
    setProductLoading(true);
    setHasSearchedProduct(true);
    setProductHistory([]);

    try {
      let query = supabase
        .from('sales_order_items')
        .select(`
          qty, unit_price, total_price,
          products!inner(part_code, part_name, unit),
          sales_orders!inner(so_number, created_at, customer_id, customers(company_name)) 
        `);

      // Filter Teks (Part Number / Nama)
      if (productSearch.trim()) {
        query = query.or(`part_code.ilike.%${productSearch}%,part_name.ilike.%${productSearch}%`, { foreignTable: 'products' });
      }

      // Filter Berdasarkan Dropdown Klien
      if (selectedProductCustomerId) {
        query = query.eq('sales_orders.customer_id', selectedProductCustomerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const sortedData = (data || []).sort((a: any, b: any) => 
        new Date(b.sales_orders?.created_at).getTime() - new Date(a.sales_orders?.created_at).getTime()
      );

      setProductHistory(sortedData);
    } catch (error: any) {
      alert(`Gagal menarik riwayat barang: ${error.message}`);
    } finally {
      setProductLoading(false);
    }
  };

  // --- EXPORT CSV ---
  const exportCSV = () => {
    if (activeTab === 'products') {
      const headers = ['Tanggal', 'Klien', 'No. SO', 'Part Number', 'Nama Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Total Harga'];
      const rows = productHistory.map(item => [
        new Date(item.sales_orders?.created_at).toLocaleDateString('id-ID'),
        `"${item.sales_orders?.customers?.company_name || '-'}"`,
        item.sales_orders?.so_number,
        `"${item.products?.part_code}"`,
        `"${item.products?.part_name}"`,
        item.qty,
        item.products?.unit,
        item.unit_price,
        item.total_price
      ]);
      downloadBlob(headers, rows, `Riwayat_Barang_${productSearch || 'Klien'}.csv`);
    } else {
      const headers = ['Tanggal', 'Klien', 'No. PO', 'No. SO', 'No. DO', 'Status Kirim', 'Invoice', 'Status Bayar', 'Total', 'Terbayar', 'Sisa'];
      const rows = reportData.map(item => [
        new Date(item.so_date).toLocaleDateString('id-ID'), 
        `"${item.company_name}"`, 
        item.po_number || '-', 
        item.so_number,
        `"${item.do_numbers}"`, 
        item.delivery_status, 
        item.invoice_number, 
        item.payment_status, 
        item.total_order_value, 
        item.total_paid_amount, 
        (item.total_order_value - item.total_paid_amount)
      ]);
      downloadBlob(headers, rows, `Laporan_Transaksi.csv`);
    }
  };

  const downloadBlob = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const fmtRp = (num: number) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const getBadgeStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('paid') || s.includes('completed')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('partial')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('unpaid') || s.includes('pending') || s.includes('open')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Fungsi untuk mengganti Tab sekaligus membersihkan Filter
  const switchTab = (tab: 'transactions' | 'products') => {
    setActiveTab(tab);
    setSelectedCustomerId('');
    setSelectedProductCustomerId('');
    setProductSearch('');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto text-black">
      
      <div className="card-modern p-5 md:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-l-4 border-l-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Pusat Laporan Eksekutif</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Pantau pergerakan transaksi dan riwayat penjualan barang CV HJP.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full lg:w-auto">
          <button 
            onClick={() => switchTab('transactions')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'transactions' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            📊 Laporan Transaksi (SO)
          </button>
          <button 
            onClick={() => switchTab('products')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            📦 Riwayat Barang
          </button>
        </div>
      </div>

      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="card-modern p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="label-modern">Jenis Laporan</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="input-modern w-full font-bold">
                  <option value="all_sales">Semua Transaksi</option>
                  <option value="unpaid">Piutang (Belum Lunas)</option>
                  <option value="partial_do">Backorder (Belum Terkirim)</option>
                </select>
              </div>
              <div>
                <label className="label-modern">Pilih Klien</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="input-modern w-full font-bold text-blue-700">
                  <option value="">-- Semua Klien --</option>
                  {customersList.map(cust => (<option key={cust.id} value={cust.id}>{cust.company_name}</option>))}
                </select>
              </div>
              <div>
                <label className="label-modern">Mulai Tanggal</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-modern w-full" />
              </div>
              <div>
                <label className="label-modern">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-modern w-full" />
              </div>
              <button onClick={fetchReport} disabled={loading} className="w-full bg-slate-800 text-white p-2.5 rounded-xl font-bold hover:bg-slate-900 transition disabled:opacity-50 h-[42px] shadow-sm">
                {loading ? 'Menarik Data...' : 'Tampilkan'}
              </button>
            </div>
          </div>

          {reportData.length > 0 && (
            <div className="card-modern overflow-hidden">
              <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <div>
                  <span className="font-black text-slate-800 text-lg">{reportData.length} Dokumen</span>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Klik kartu/baris untuk membuka Rincian Laporan (360° View).</p>
                </div>
                <button onClick={exportCSV} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export CSV
                </button>
              </div>

              <div className="hidden lg:block overflow-x-auto max-h-[65vh] custom-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100 font-black text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-inner">
                    <tr>
                      <th className="p-4 border-b">Tanggal</th>
                      <th className="p-4 border-b">Klien / PT</th>
                      <th className="p-4 border-b">Dokumen</th>
                      <th className="p-4 border-b">Pengiriman (DO)</th>
                      <th className="p-4 border-b">Penagihan (INV)</th>
                      <th className="p-4 border-b text-right">Nilai & Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((item) => {
                      const balance = item.total_order_value - item.total_paid_amount;
                      return (
                        <tr key={item.so_id} onClick={() => handleRowClick(item.so_id)} className="cursor-pointer transition-colors hover:bg-blue-50/50 group">
                          <td className="p-4 text-slate-600 font-medium">{new Date(item.so_date).toLocaleDateString('id-ID')}</td>
                          <td className="p-4 font-black text-slate-900 uppercase">{item.company_name}</td>
                          <td className="p-4">
                            <div className="font-bold text-blue-700 group-hover:underline">{item.so_number}</div>
                            <div className="font-mono text-[10px] text-slate-500 font-bold mt-0.5">PO: {item.po_number || '-'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase mb-1.5 inline-block border ${getBadgeStyle(item.delivery_status)}`}>
                              {item.delivery_status || 'Open'}
                            </span>
                            <div className="font-mono text-[10px] text-slate-600 font-bold truncate max-w-[150px]" title={item.do_numbers}>{item.do_numbers || '-'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase mb-1.5 inline-block border ${getBadgeStyle(item.payment_status)}`}>
                              {item.payment_status || 'Unpaid'}
                            </span>
                            <div className="font-mono text-[10px] text-slate-600 font-bold">{item.invoice_number || '-'}</div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="font-black text-slate-950">{fmtRp(item.total_order_value)}</div>
                            {balance > 0 && <div className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded inline-block mt-1">Sisa: {fmtRp(balance)}</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden p-4 space-y-4 bg-slate-50/30">
                {reportData.map((item) => {
                  const balance = item.total_order_value - item.total_paid_amount;
                  return (
                    <div key={item.so_id} onClick={() => handleRowClick(item.so_id)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-black text-slate-900 uppercase text-sm w-3/4">{item.company_name}</div>
                        <div className="text-[10px] font-bold text-slate-400">{new Date(item.so_date).toLocaleDateString('id-ID')}</div>
                      </div>
                      <div className="font-mono text-xs font-bold text-blue-700 mb-3 underline">{item.so_number}</div>
                      
                      <div className="flex gap-2 mb-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${getBadgeStyle(item.delivery_status)}`}>DO: {item.delivery_status || 'Open'}</span>
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${getBadgeStyle(item.payment_status)}`}>INV: {item.payment_status || 'Unpaid'}</span>
                      </div>

                      <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500 font-bold">Total Nilai</div>
                        <div className="text-right">
                          <div className="font-black text-slate-900">{fmtRp(item.total_order_value)}</div>
                          {balance > 0 && <div className="text-[10px] font-black text-rose-600 mt-0.5">Sisa: {fmtRp(balance)}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB: RIWAYAT BARANG (Diperbarui) --- */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-emerald-50 p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-emerald-900">Tarik Rincian Barang per Klien</h2>
            <form onSubmit={fetchProductHistory} className="flex flex-col md:flex-row gap-4 items-end">
              
              <div className="w-full md:w-1/3">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Filter Klien (Opsional)</label>
                <select 
                  value={selectedProductCustomerId} 
                  onChange={(e) => setSelectedProductCustomerId(e.target.value)} 
                  className="input-modern w-full font-bold text-emerald-900 focus:border-emerald-500"
                >
                  <option value="">-- Semua Klien --</option>
                  {customersList.map(cust => (<option key={cust.id} value={cust.id}>{cust.company_name}</option>))}
                </select>
              </div>

              <div className="w-full md:w-auto flex-1 relative">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Cari Barang (Opsional)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ketik Part Number (PN) atau Nama Barang..." 
                    className="input-modern w-full pl-11 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/20 font-bold"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <svg className="w-5 h-5 absolute left-4 top-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
              
              <button type="submit" disabled={productLoading} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition disabled:bg-emerald-300 shadow-sm h-[48px] whitespace-nowrap">
                {productLoading ? 'Menarik...' : 'Tarik Rincian'}
              </button>
            </form>
          </div>

          {hasSearchedProduct && (
            <div className="card-modern overflow-hidden">
              <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <span className="font-black text-slate-800 text-lg">
                  {productHistory.length > 0 ? `${productHistory.length} Riwayat Ditemukan` : 'Tidak ada riwayat penjualan.'}
                </span>
                {productHistory.length > 0 && (
                  <button onClick={exportCSV} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">📥 Export CSV</button>
                )}
              </div>
              
              {productHistory.length > 0 && (
                <>
                  <div className="hidden lg:block overflow-x-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-100 font-black text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-inner">
                        <tr>
                          <th className="p-4 border-b">Tanggal</th>
                          <th className="p-4 border-b">Klien</th>
                          <th className="p-4 border-b">No. SO</th>
                          <th className="p-4 border-b">Barang</th>
                          <th className="p-4 border-b text-center">Qty</th>
                          <th className="p-4 border-b text-right">Harga Jual /Pcs</th>
                          <th className="p-4 border-b text-right">Total Pendapatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productHistory.map((item, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                            <td className="p-4 font-medium text-slate-600">{new Date(item.sales_orders?.created_at).toLocaleDateString('id-ID')}</td>
                            <td className="p-4 font-black text-slate-900 uppercase">{item.sales_orders?.customers?.company_name}</td>
                            <td className="p-4 font-mono font-bold text-blue-600 text-xs">{item.sales_orders?.so_number}</td>
                            <td className="p-4">
                              <div className="font-mono font-black text-slate-800">{item.products?.part_code}</div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5">{item.products?.part_name}</div>
                            </td>
                            <td className="p-4 text-center font-black text-emerald-600">{item.qty} <span className="text-[10px] text-slate-400">{item.products?.unit}</span></td>
                            <td className="p-4 text-right font-medium text-slate-600">{fmtRp(item.unit_price)}</td>
                            <td className="p-4 text-right font-black text-slate-900">{fmtRp(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden p-4 space-y-4 bg-slate-50/30">
                    {productHistory.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-black text-slate-900 uppercase text-sm w-3/4">{item.sales_orders?.customers?.company_name}</div>
                          <div className="text-[10px] font-bold text-slate-400">{new Date(item.sales_orders?.created_at).toLocaleDateString('id-ID')}</div>
                        </div>
                        <div className="font-mono text-xs font-bold text-blue-600 mb-3 bg-blue-50 inline-block px-2 py-1 rounded">{item.sales_orders?.so_number}</div>
                        
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg mb-3">
                          <div className="font-mono font-black text-slate-800">{item.products?.part_code}</div>
                          <div className="text-xs text-slate-600 font-semibold">{item.products?.part_name}</div>
                        </div>

                        <div className="flex justify-between items-end pt-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Qty Terjual</span>
                            <span className="font-black text-emerald-600">{item.qty} {item.products?.unit}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Total Pendapatan</span>
                            <span className="font-black text-slate-900">{fmtRp(item.total_price)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}