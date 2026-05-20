'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// --- Utility Functions Khusus Tab Transaksi ---
const fmtRp = (num: number) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

const getBadgeStyle = (status: string) => {
  const s = status?.toLowerCase() || '';
  // [TAMBAHAN CANCEL INVOICE] Tambah style warna khusus untuk batal
  if (s.includes('cancel')) return 'bg-slate-200 text-slate-600 border-slate-300'; 
  
  if (s.includes('unpaid') || s.includes('pending') || s.includes('open')) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (s.includes('paid') || s.includes('completed') || s.includes('delivered')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('partial')) return 'bg-blue-100 text-blue-700 border-blue-200';
  
  return 'bg-slate-100 text-slate-700 border-slate-200';
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

export default function TransactionsTab({ customersList }: { customersList: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('all_sales'); 
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); 
  const [reportData, setReportData] = useState<any[]>([]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Panggil View yang sudah kita perbaiki tadi
      let query = supabase
        .from('view_finance_reports')
        .select('*')
        .gte('so_date', startDate)
        .lte('so_date', endDate)
        .order('so_date', { ascending: false });

      if (selectedCustomerId) query = query.eq('customer_id', selectedCustomerId);

      const { data, error } = await query;
      if (error) throw error;

      // Filter tipe laporan berdasarkan dropdown di UI
      let formatted = data || [];
      if (reportType === 'unpaid') {
        // [TAMBAHAN CANCEL INVOICE] Pastikan report unpaid tidak menarik yang cancelled
        formatted = formatted.filter(item => {
          const s = item.payment_status?.toLowerCase();
          return s !== 'paid' && !s?.includes('cancel');
        });
      } else if (reportType === 'partial_do') {
        formatted = formatted.filter(item => item.delivery_status !== 'Delivered' && item.delivery_status !== 'Completed');
      }

      setReportData(formatted); 
    } catch (err: any) {
      alert(`Gagal menarik laporan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Tanggal', 'Klien', 'No. PO', 'No. SO', 'No. DO', 'Status Kirim', 'Invoice', 'Status Bayar', 'Total', 'Terbayar', 'Sisa'];
    const rows = reportData.map(item => {
      // [TAMBAHAN CANCEL INVOICE] Set sisa jadi 0 jika batal, agar tidak error di laporan Excel/CSV
      const isCancelled = item.payment_status?.toLowerCase().includes('cancel');
      const isPaid = item.payment_status?.toLowerCase() === 'paid';
      const sisaTagihan = (isPaid || isCancelled) ? 0 : Math.max(0, item.total_order_value - (item.total_paid_amount || 0));

      return [
        new Date(item.so_date).toLocaleDateString('id-ID'), `"${item.company_name}"`, item.po_number || '-', item.so_number,
        `"${item.do_numbers}"`, item.delivery_status, item.invoice_number, item.payment_status, item.total_order_value, 
        item.total_paid_amount || 0, sisaTagihan
      ];
    });
    downloadBlob(headers, rows, `Laporan_Transaksi.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="card-modern p-5 space-y-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
          <button onClick={fetchTransactions} disabled={loading} className="w-full bg-slate-800 text-white p-2.5 rounded-xl font-bold hover:bg-slate-900 transition disabled:opacity-50 h-[42px] shadow-sm">
            {loading ? 'Menarik...' : 'Tampilkan'}
          </button>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="card-modern overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <span className="font-black text-slate-800 text-lg">{reportData.length} Transaksi Ditemukan</span>
            </div>
            <button onClick={exportCSV} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2">
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto max-h-[65vh] custom-scrollbar">
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
                  // [TAMBAHAN CANCEL INVOICE] Deteksi status
                  const isCancelled = item.payment_status?.toLowerCase().includes('cancel');
                  const isPaid = item.payment_status?.toLowerCase() === 'paid';
                  const balance = (isPaid || isCancelled) ? 0 : Math.max(0, item.total_order_value - (item.total_paid_amount || 0));
                  
                  return (
                    <tr key={item.so_id} onClick={() => router.push(`/dashboard/sales-orders/${item.so_id}`)} className={`cursor-pointer transition-colors group ${isCancelled ? 'bg-slate-50 opacity-70' : 'hover:bg-blue-50/50'}`}>
                      <td className="p-4 text-slate-600 font-medium">{new Date(item.so_date).toLocaleDateString('id-ID')}</td>
                      <td className={`p-4 font-black uppercase ${isCancelled ? 'text-slate-500' : 'text-slate-900'}`}>{item.company_name}</td>
                      <td className="p-4">
                        <div className={`font-bold group-hover:underline ${isCancelled ? 'text-slate-500' : 'text-blue-700'}`}>{item.so_number}</div>
                        <div className="font-mono text-[10px] text-slate-500 font-bold mt-0.5">PO: {item.po_number || '-'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase mb-1.5 inline-block border ${getBadgeStyle(item.delivery_status)}`}>{item.delivery_status || 'Open'}</span>
                        <div className="font-mono text-[10px] text-slate-600 font-bold max-w-[150px]">{item.do_numbers || '-'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase mb-1.5 inline-block border ${getBadgeStyle(item.payment_status)}`}>{item.payment_status || 'Unpaid'}</span>
                        <div className="font-mono text-[10px] text-slate-600 font-bold">{item.invoice_number || '-'}</div>
                      </td>
                      <td className="p-4 text-right">
                        {/* [TAMBAHAN CANCEL INVOICE] Nilai dicoret jika batal */}
                        <div className={`font-black ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-950'}`}>{fmtRp(item.total_order_value)}</div>
                        
                        {/* Label sisa merah tidak dimunculkan kalau invoice sudah batal */}
                        {balance > 0 && !isCancelled && (
                          <div className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded inline-block mt-1">
                            Sisa: {fmtRp(balance)}
                          </div>
                        )}
                      </td>
                    </tr>
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