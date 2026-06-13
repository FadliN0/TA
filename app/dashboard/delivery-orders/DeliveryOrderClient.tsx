'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function DeliveryOrderListClient({ initialOrders }: { initialOrders: any[] }) {
  const [search, setSearch] = useState('');
  const deliveryOrders = initialOrders;

  const filteredOrders = deliveryOrders.filter(doItem =>
    doItem.do_number?.toLowerCase().includes(search.toLowerCase()) ||
    (doItem.sales_orders?.so_number && doItem.sales_orders.so_number.toLowerCase().includes(search.toLowerCase())) ||
    (doItem.sales_orders?.customers?.company_name && doItem.sales_orders.customers.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'Partial') return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">⏳ Partial (Sebagian)</span>;
    if (status === 'Completed') return <span className="bg-teal-100 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">✅ Selesai (Full)</span>;
    return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">{status}</span>;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 animate-in fade-in duration-500 text-black">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-modern p-6 border-l-4 border-l-teal-500">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Surat Jalan (Delivery Order)</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Pantau status pengiriman fisik suku cadang ke lokasi pelanggan.</p>
        </div>
      </div>

      <div className="card-modern p-5">
        <div className="relative max-w-2xl">
          <input type="text" placeholder="Cari berdasarkan No. DO, No. SO, atau Nama Klien..." className="input-modern pl-11 text-sm font-bold text-teal-900 focus:border-teal-500 focus:ring-teal-500/20 w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
          <svg className="w-5 h-5 absolute left-4 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card-modern p-16 text-center flex flex-col items-center justify-center border-dashed border-2 bg-slate-50/50">
          <h3 className="text-lg font-black text-slate-700">Tidak ada pengiriman</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Belum ada Surat Jalan yang diterbitkan dari modul Sales Order.</p>
        </div>
      ) : (
        <div className="hidden md:block card-modern overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">No. Surat Jalan</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Ref. Sales Order</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tanggal Kirim</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Klien (Ship To)</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((doItem) => (
                  <tr key={doItem.id} className="hover:bg-teal-50/50 transition-colors group">
                    <td className="p-4"><div className="font-mono text-sm font-black text-teal-700">{doItem.do_number}</div></td>
                    <td className="p-4"><div className="inline-block bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-mono font-bold text-slate-600 shadow-sm">{doItem.sales_orders?.so_number || '-'}</div></td>
                    <td className="p-4 text-sm font-bold text-slate-700">{new Date(doItem.delivery_date || doItem.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                    <td className="p-4 text-sm font-black text-slate-800 uppercase">{doItem.sales_orders?.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}</td>
                    <td className="p-4 text-center"><StatusBadge status={doItem.calculatedStatus} /></td>
                    <td className="p-4 text-center"><Link href={`/dashboard/delivery-orders/${doItem.id}`} className="text-xs font-bold text-teal-700 bg-white border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 px-4 py-2 rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5 w-full justify-center">Buka</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}