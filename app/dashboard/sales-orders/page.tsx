'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SalesOrderListPage() {
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customers ( company_name )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setSalesOrders(data);
    } catch (err) {
      console.error("Gagal mengambil data SO:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, soNumber: string) => {
    const isConfirm = window.confirm(`PERINGATAN: Yakin ingin menghapus dokumen Sales Order ${soNumber} secara permanen?\nSemua rincian barang di dalamnya akan ikut terhapus.`);
    if (!isConfirm) return;

    try {
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) throw error;
      fetchSalesOrders();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const filteredOrders = salesOrders.filter(so => 
    so.so_number?.toLowerCase().includes(search.toLowerCase()) ||
    (so.po_number && so.po_number.toLowerCase().includes(search.toLowerCase())) ||
    (so.customers?.company_name && so.customers.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  // Komponen Helper untuk Badge Status
  const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
      case 'Open': 
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block border border-blue-200">Open</span>;
      case 'Processing': 
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block border border-amber-200">Diproses</span>;
      case 'Completed': 
        return <span className="badge-success">Selesai</span>;
      case 'Cancelled': 
        return <span className="badge-danger">Batal</span>;
      default: 
        return <span className="badge-neutral">{status}</span>;
    }
  };

  const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 animate-in fade-in duration-500">
      
      {/* HEADER ELEGAN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Sales Order (SO)</h1>
          <p className="text-sm text-slate-500">Pantau pesanan resmi yang masuk dan siap diproses.</p>
        </div>
      </div>

      {/* PENCARIAN */}
      <div className="card-modern p-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cari berdasarkan Nomor SO, Nomor PO Klien, atau Nama Perusahaan..." 
            className="input-modern pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">Memuat data pesanan...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card-modern p-16 text-center flex flex-col items-center justify-center border-dashed border-2">
          <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <h3 className="text-lg font-bold text-slate-700">Tidak ada pesanan</h3>
          <p className="text-sm text-slate-500 mt-1">Belum ada Sales Order yang terdaftar atau ditemukan.</p>
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
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">No. Sales Order</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">No. PO (Klien)</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Tanggal Masuk</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Klien (B2B)</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Nilai Pesanan</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="font-mono text-sm font-bold text-emerald-700">{so.so_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="inline-block bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700 shadow-sm">
                        PO: {so.po_number || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-800">
                      {new Date(so.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-sm font-black text-slate-800 uppercase">
                      {so.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}
                    </td>
                    <td className="p-4 text-sm text-slate-900 text-right font-black">
                      {fmtRp(so.grand_total || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={so.status} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Link 
                          href={`/dashboard/sales-orders/${so.id}`} 
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Proses
                        </Link>
                        <button 
                          onClick={() => handleDelete(so.id, so.so_number)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          title="Hapus Dokumen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ==========================================
              TAMPILAN MOBILE (KARTU)
              ========================================== */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((so) => (
              <div key={so.id} className="card-modern p-5 flex flex-col gap-3 relative border-l-4 border-l-emerald-500">
                
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <div className="font-mono text-sm font-bold text-emerald-700">{so.so_number}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                      {new Date(so.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <StatusBadge status={so.status} />
                </div>
                
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase mb-1">
                    {so.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}
                  </h3>
                  <div className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-600 mb-2">
                    PO: {so.po_number || '-'}
                  </div>
                  <div className="text-lg font-black text-slate-900">{fmtRp(so.grand_total || 0)}</div>
                </div>

                <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-100 mt-1">
                  <button 
                    onClick={() => handleDelete(so.id, so.so_number)}
                    className="text-xs font-bold text-rose-500 px-2 py-2"
                  >
                    Hapus
                  </button>
                  <Link 
                    href={`/dashboard/sales-orders/${so.id}`} 
                    className="flex-1 text-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Buka & Proses
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}