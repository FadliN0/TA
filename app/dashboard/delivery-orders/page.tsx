'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DeliveryOrderListPage() {
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryOrders();
  }, []);

  const fetchDeliveryOrders = async () => {
    setLoading(true);
    // Join ke sales_orders untuk mendapatkan SO Number dan Nama Customer
    const { data, error } = await supabase
      .from('delivery_orders')
      .select(`
        *,
        sales_orders ( 
          so_number, 
          customers ( company_name ) 
        )
      `)
      .order('created_at', { ascending: false });
    
    if (data) setDeliveryOrders(data);
    setLoading(false);
  };

  const filteredOrders = deliveryOrders.filter(doItem => 
    doItem.do_number.toLowerCase().includes(search.toLowerCase()) ||
    (doItem.sales_orders?.so_number && doItem.sales_orders.so_number.toLowerCase().includes(search.toLowerCase())) ||
    (doItem.sales_orders?.customers?.company_name && doItem.sales_orders.customers.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Surat Jalan (Delivery Order)</h1>
          <p className="text-sm text-gray-500">Pantau pengiriman fisik barang ke lokasi pelanggan.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input 
          type="text" 
          placeholder="Cari No. DO, No. SO, atau Nama Klien..." 
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
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">No. Surat Jalan</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Ref. Sales Order</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Tanggal Kirim</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Klien (Ship To)</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Memuat data pengiriman...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Belum ada Surat Jalan.</td></tr>
              ) : (
                filteredOrders.map((doItem) => (
                  <tr key={doItem.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="p-4 font-mono text-sm font-bold text-teal-700">{doItem.do_number}</td>
                    <td className="p-4 text-sm font-bold text-gray-600">{doItem.sales_orders?.so_number || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(doItem.delivery_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800">
                      {doItem.sales_orders?.customers?.company_name || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider bg-green-100 text-green-700 border-green-200">
                        {doItem.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Link 
                        href={`/dashboard/delivery-orders/${doItem.id}`} 
                        className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
                      >
                        Detail / Cetak
                      </Link>
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