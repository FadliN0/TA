'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Mengambil data Invoice beserta relasi langsung ke Customer dan SO
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

  // Filter pencarian berdasarkan No. Invoice, Nama Klien, atau No. SO
  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (inv.customers?.company_name && inv.customers.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (inv.sales_orders?.so_number && inv.sales_orders.so_number.toLowerCase().includes(search.toLowerCase()))
  );

  // Helper untuk warna status (Badge)
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Lunas</span>;
      case 'partial':
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Parsial</span>;
      case 'unpaid':
      default:
        return <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Belum Bayar</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tagihan (Invoices)</h1>
          <p className="text-sm text-gray-500">Pantau dan kelola penagihan pembayaran ke klien.</p>
        </div>
      </div>

      {/* Kolom Pencarian */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input 
          type="text" 
          placeholder="Cari No. Invoice, Nama Klien, atau No. SO..." 
          className="w-full border p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabel Daftar Invoice */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">No. Invoice</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Pelanggan</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Jatuh Tempo</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Total Tagihan</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Memuat data penagihan...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Belum ada dokumen Invoice.</td></tr>
              ) : (
                filteredInvoices.map((inv) => {
                  // Cek apakah sudah lewat jatuh tempo dan belum lunas
                  const isOverdue = new Date(inv.due_date) < new Date() && inv.status?.toLowerCase() !== 'paid';

                  return (
                    <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-sm font-bold text-blue-700">{inv.invoice_number}</div>
                        <div className="text-xs text-gray-400 font-medium mt-1">Ref SO: {inv.sales_orders?.so_number || '-'}</div>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-800">
                        {inv.customers?.company_name || '-'}
                      </td>
                      <td className="p-4">
                        <div className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                          {new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {isOverdue && <div className="text-[10px] text-red-500 font-bold uppercase mt-1">Overdue!</div>}
                      </td>
                      <td className="p-4 text-sm font-black text-gray-800 text-right">
                        Rp {(inv.grand_total || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="p-4 text-center">
                        <Link 
                          href={`/dashboard/invoices/${inv.id}`} 
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Detail / Cetak
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}