'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function QuotationListPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    // Mengambil data Quotation sekaligus JOIN ke tabel customers untuk mendapatkan nama perusahaan
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers ( company_name )
      `)
      .order('created_at', { ascending: false }); // Urutkan dari yang paling baru
    
    if (data) setQuotations(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, qNumber: string) => {
    const isConfirm = window.confirm(`Hapus dokumen penawaran ${qNumber}?`);
    if (!isConfirm) return;

    // Menghapus quotation otomatis akan menghapus quotation_items berkat ON DELETE CASCADE di SQL-mu
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    
    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      fetchQuotations();
    }
  };

  // Filter pencarian berdasarkan Nomor Dokumen atau Nama Klien
  const filteredQuotations = quotations.filter(q => 
    q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
    (q.customers?.company_name && q.customers.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  // Fungsi pembantu untuk warna badge status
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dokumen Quotation</h1>
          <p className="text-sm text-gray-500">Kelola dan cetak surat penawaran harga suku cadang.</p>
        </div>
        <Link href="/dashboard/quotations/create" className="bg-blue-600 text-white px-5 py-2.5 rounded-md font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors">
          + Buat Quotation Baru
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input 
          type="text" 
          placeholder="Cari Nomor Dokumen atau Nama Pelanggan..." 
          className="w-full border p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">No. Dokumen</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Tanggal</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Klien B2B</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Grand Total</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Memuat data dokumen...</td></tr>
              ) : filteredQuotations.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Belum ada dokumen Quotation.</td></tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 font-mono text-sm font-bold text-blue-700">{q.quotation_number}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(q.created_at).toLocaleDateString('id-ID')}
                      <div className="text-[10px] text-gray-400 mt-0.5">Valid: {new Date(q.valid_until).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800">
                      {q.customers?.company_name || <span className="text-gray-400 italic">Klien Terhapus</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-900 text-right font-bold">
                      Rp {q.grand_total?.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-3">
                      {/* LINK MENUJU HALAMAN DETAIL & PDF */}
                      <Link 
                        href={`/dashboard/quotations/${q.id}`} 
                        className="text-xs font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors inline-block"
                      >
                        Detail & PDF
                      </Link>
                      <button 
                        onClick={() => handleDelete(q.id, q.quotation_number)}
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