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
    // Mengambil data SO sekaligus JOIN ke tabel customers untuk nama perusahaan
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers ( company_name )
      `)
      .order('created_at', { ascending: false });
    
    if (data) setSalesOrders(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, soNumber: string) => {
    const isConfirm = window.confirm(`PERINGATAN: Hapus dokumen Sales Order ${soNumber} secara permanen?`);
    if (!isConfirm) return;

    // Berkat ON DELETE CASCADE di SQL kamu, rincian barang di sales_order_items akan otomatis terhapus
    const { error } = await supabase.from('sales_orders').delete().eq('id', id);
    
    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      fetchSalesOrders();
    }
  };

  // Filter pencarian: Bisa cari Nomor SO internal, Nomor PO Klien, atau Nama Klien
  const filteredOrders = salesOrders.filter(so => 
    so.so_number.toLowerCase().includes(search.toLowerCase()) ||
    (so.po_number && so.po_number.toLowerCase().includes(search.toLowerCase())) ||
    (so.customers?.company_name && so.customers.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  // Badge Status untuk Sales Order
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Processing': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Order (SO)</h1>
          <p className="text-sm text-gray-500">Pantau pesanan resmi yang masuk dari Klien B2B.</p>
        </div>
        {/* Tombol Create SO manual disiapkan jika sewaktu-waktu admin butuh input SO tanpa lewat Quotation */}
        <Link href="/dashboard/sales-orders/create" className="bg-blue-600 text-white px-5 py-2.5 rounded-md font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors">
          + Input SO Manual
        </Link>
      </div>

      {/* Bar Pencarian */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input 
          type="text" 
          placeholder="Cari berdasarkan Nomor SO, Nomor PO Klien, atau Nama Perusahaan..." 
          className="w-full border p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">No. Sales Order</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">No. PO (Klien)</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Tanggal Masuk</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Klien B2B</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Nilai Pesanan</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-medium">Memuat data pesanan...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-medium">Belum ada Sales Order.</td></tr>
              ) : (
                filteredOrders.map((so) => (
                  <tr key={so.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 font-mono text-sm font-bold text-blue-700">{so.so_number}</td>
                    
                    {/* Nomor PO Klien Ditonjolkan */}
                    <td className="p-4 text-sm font-bold text-gray-800">
                      <span className="bg-gray-100 border px-2 py-1 rounded font-mono text-xs">
                        {so.po_number || '-'}
                      </span>
                    </td>
                    
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(so.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    
                    <td className="p-4 text-sm font-bold text-gray-800">
                      {so.customers?.company_name || <span className="text-gray-400 italic">Klien Terhapus</span>}
                    </td>
                    
                    <td className="p-4 text-sm text-gray-900 text-right font-bold">
                      Rp {so.grand_total?.toLocaleString('id-ID')}
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(so.status)}`}>
                        {so.status}
                      </span>
                    </td>
                    
                    <td className="p-4 text-center space-x-3">
                      {/* LINK MENUJU HALAMAN DETAIL & PDF SO */}
                      <Link 
                        href={`/dashboard/sales-orders/${so.id}`} 
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded transition-colors inline-block"
                      >
                        Detail / Proses
                      </Link>
                      <button 
                        onClick={() => handleDelete(so.id, so.so_number)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors inline-block"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}