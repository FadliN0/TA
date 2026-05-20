'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers ( company_name ),
          sales_orders ( so_number )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Logika Pencarian & Filter Gabungan
  const filteredInvoices = invoices.filter(inv => {
    // 1. Cek Pencarian Teks
    const matchSearch = 
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customers?.company_name && inv.customers.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (inv.sales_orders?.so_number && inv.sales_orders.so_number.toLowerCase().includes(search.toLowerCase()));

    // 2. Tentukan Status Aktual Dokumen
    const statusLower = inv.status?.toLowerCase();
    // [TAMBAHAN CANCEL INVOICE] Deteksi status batal
    const isCancelled = statusLower === 'cancelled' || statusLower === 'canceled';
    const isPaid = statusLower === 'paid';
    
    // [TAMBAHAN CANCEL INVOICE] Invoice batal tidak boleh masuk logika overdue atau unpaid
    const isOverdue = new Date(inv.due_date) < new Date() && !isPaid && !isCancelled;
    const isUnpaid = !isPaid && !isCancelled && !isOverdue; 

    // 3. Terapkan Filter Dropdown
    if (filter === 'Overdue') return matchSearch && isOverdue;
    if (filter === 'Paid') return matchSearch && isPaid;
    if (filter === 'Unpaid') return matchSearch && isUnpaid;
    if (filter === 'Cancelled') return matchSearch && isCancelled; // [TAMBAHAN CANCEL INVOICE]
    
    return matchSearch; // Default: 'All'
  });

  // Helper untuk warna status (Badge)
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="badge-success">Lunas</span>;
      case 'partial':
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block">Parsial</span>;
      // [TAMBAHAN CANCEL INVOICE] Tambah warna merah terang untuk badge batal
      case 'cancelled':
      case 'canceled':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block">Dibatalkan</span>;
      case 'unpaid':
      default:
        return <span className="badge-danger">Belum Bayar</span>;
    }
  };

  const fmtRp = (num: number) => `Rp ${(num || 0).toLocaleString('id-ID')}`;

  // [TAMBAHAN CANCEL INVOICE] Pastikan invoice batal tidak ikut terhitung sebagai badge alert "Overdue"
  const overdueCount = invoices.filter(inv => {
    const statusLower = inv.status?.toLowerCase();
    return new Date(inv.due_date) < new Date() && statusLower !== 'paid' && statusLower !== 'cancelled' && statusLower !== 'canceled';
  }).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 animate-in fade-in duration-500">
      
      {/* HEADER ELEGAN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800">Tagihan (Invoices)</h1>
            {overdueCount > 0 && (
              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider animate-pulse border border-rose-200 shadow-sm">
                {overdueCount} Overdue!
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Pantau dan kelola penagihan pembayaran ke pelanggan.</p>
        </div>
      </div>

      {/* ── BAR PENCARIAN & FILTER ── */}
      <div className="card-modern p-4 flex flex-col md:flex-row gap-3">
        {/* Kolom Pencarian */}
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Cari No. Invoice, Nama Klien, atau No. SO..." 
            className="input-modern pl-10 focus:ring-purple-500/20 focus:border-purple-500 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* Dropdown Filter Sakti */}
        <div className="md:w-64 shrink-0">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-modern w-full font-bold text-slate-600 bg-slate-50 cursor-pointer focus:ring-purple-500/20 focus:border-purple-500 appearance-none bg-no-repeat bg-[right_12px_center]"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundSize: '12px' }}
          >
            <option value="All">📋 Tampilkan Semua Status</option>
            <option value="Paid">✅ Sudah Lunas</option>
            <option value="Unpaid">⏳ Belum Bayar (Aktif)</option>
            <option value="Overdue">🚨 OVERDUE (Telat Bayar)</option>
            <option value="Cancelled">🚫 Dibatalkan</option> {/* [TAMBAHAN CANCEL INVOICE] */}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">Memuat data penagihan...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="card-modern p-16 text-center flex flex-col items-center justify-center border-dashed border-2">
          <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <h3 className="text-lg font-bold text-slate-700">Tidak ada tagihan</h3>
          <p className="text-sm text-slate-500 mt-1">
            {filter !== 'All' ? `Tidak ada Invoice dengan status "${filter}" yang cocok.` : 'Belum ada dokumen Invoice yang diterbitkan.'}
          </p>
        </div>
      ) : (
        <>
          {/* ==========================================
              TAMPILAN DESKTOP (TABEL)
              ========================================== */}
          <div className="hidden md:block card-modern overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">No. Invoice</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Pelanggan (B2B)</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Jatuh Tempo</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Total Tagihan</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const statusLower = inv.status?.toLowerCase();
                  const isCancelled = statusLower === 'cancelled' || statusLower === 'canceled';
                  const isOverdue = new Date(inv.due_date) < new Date() && statusLower !== 'paid' && !isCancelled;

                  return (
                    <tr key={inv.id} className={`transition-colors group ${isCancelled ? 'bg-slate-50 opacity-70' : 'hover:bg-purple-50/30'}`}>
                      <td className="p-4">
                        <div className={`font-mono text-sm font-bold ${isCancelled ? 'text-slate-500 line-through' : 'text-purple-700'}`}>{inv.invoice_number}</div>
                        <div className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-500 mt-1 shadow-sm">
                          Ref SO: {inv.sales_orders?.so_number || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-black text-slate-800 uppercase">
                        {inv.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}
                      </td>
                      <td className="p-4">
                        <div className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                          {new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {isOverdue && <div className="text-[10px] text-rose-500 font-black uppercase mt-0.5 tracking-widest animate-pulse">Overdue!</div>}
                      </td>
                      <td className="p-4 text-sm text-slate-900 text-right font-black">
                        {/* [TAMBAHAN CANCEL INVOICE] Coret angka total jika batal */}
                        <span className={isCancelled ? 'line-through text-slate-400 font-medium' : ''}>
                          {fmtRp(inv.grand_total)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="p-4 text-center">
                        <Link 
                          href={`/dashboard/invoices/${inv.id}`} 
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          {isCancelled ? 'Lihat' : 'Buka Detail'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ==========================================
              TAMPILAN MOBILE (KARTU)
              ========================================== */}
          <div className="md:hidden space-y-4">
            {filteredInvoices.map((inv) => {
              const statusLower = inv.status?.toLowerCase();
              const isCancelled = statusLower === 'cancelled' || statusLower === 'canceled';
              const isOverdue = new Date(inv.due_date) < new Date() && statusLower !== 'paid' && !isCancelled;

              return (
                <div key={inv.id} className={`card-modern p-5 flex flex-col gap-3 relative border-l-4 ${isOverdue ? 'border-l-rose-500 bg-rose-50/10' : isCancelled ? 'border-l-slate-400 bg-slate-50' : 'border-l-purple-500'}`}>
                  
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <div className={`font-mono text-sm font-bold ${isCancelled ? 'text-slate-500 line-through' : 'text-purple-700'}`}>{inv.invoice_number}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1">Jatuh Tempo:</div>
                      <div className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                        {new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {isOverdue && <span className="ml-2 text-[10px] text-rose-500 uppercase tracking-widest animate-pulse">Overdue!</span>}
                      </div>
                    </div>
                    {getStatusBadge(inv.status)}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase mb-1">
                      {inv.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}
                    </h3>
                    <div className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-600 mb-2">
                      Ref SO: {inv.sales_orders?.so_number || '-'}
                    </div>
                    {/* [TAMBAHAN CANCEL INVOICE] Coret angka total di mobile juga */}
                    <div className={`text-lg font-black ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {fmtRp(inv.grand_total)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-1">
                    <Link 
                      href={`/dashboard/invoices/${inv.id}`} 
                      className={`w-full text-center text-xs font-bold px-4 py-3 rounded-xl transition-colors block ${isCancelled ? 'text-slate-600 bg-slate-200 hover:bg-slate-300' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'}`}
                    >
                      {isCancelled ? 'Lihat Detail' : 'Buka & Proses Pembayaran'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}