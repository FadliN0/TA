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
    try {
      // Menarik data DO beserta item-nya, dan SO beserta item-nya sekaligus untuk perbandingan
      const { data, error } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          sales_orders ( 
            so_number, 
            customers ( company_name ),
            sales_order_items ( id, qty )
          ),
          delivery_order_items ( qty_delivered, so_item_id )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      if (data) {
        // ── ALGORITMA CERDAS: Deteksi Partial atau Completed untuk setiap DO ──
        const processedData = data.map(doItem => {
          let isPartial = false;
          
          if (doItem.delivery_order_items && doItem.sales_orders?.sales_order_items) {
            for (const doi of doItem.delivery_order_items) {
              // Cari barang asli di SO
              const soItem = doItem.sales_orders.sales_order_items.find((si: any) => si.id === doi.so_item_id);
              const originalQty = soItem?.qty || 0;
              
              // Jika ada satu saja barang yang dikirim kurang dari pesanan asli = PARTIAL
              if (doi.qty_delivered < originalQty) {
                isPartial = true;
                break;
              }
            }
          }

          return {
            ...doItem,
            calculatedStatus: isPartial ? 'Partial' : 'Completed'
          };
        });

        setDeliveryOrders(processedData);
      }
    } catch (err) {
      console.error("Gagal memuat data DO:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = deliveryOrders.filter(doItem => 
    doItem.do_number?.toLowerCase().includes(search.toLowerCase()) ||
    (doItem.sales_orders?.so_number && doItem.sales_orders.so_number.toLowerCase().includes(search.toLowerCase())) ||
    (doItem.sales_orders?.customers?.company_name && doItem.sales_orders.customers.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  // ── KOMPONEN BADGE CERDAS ──
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'Partial') {
      return (
        <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
          ⏳ Partial (Sebagian)
        </span>
      );
    }
    if (status === 'Completed') {
      return (
        <span className="bg-teal-100 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
          ✅ Selesai (Full)
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 animate-in fade-in duration-500 text-black">
      
      {/* ── HEADER ELEGAN ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-modern p-6 border-l-4 border-l-teal-500">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Surat Jalan (Delivery Order)</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Pantau status pengiriman fisik suku cadang ke lokasi pelanggan.</p>
        </div>
      </div>

      {/* ── PENCARIAN ── */}
      <div className="card-modern p-5">
        <div className="relative max-w-2xl">
          <input 
            type="text" 
            placeholder="Cari berdasarkan No. DO, No. SO, atau Nama Klien..." 
            className="input-modern pl-11 text-sm font-bold text-teal-900 focus:border-teal-500 focus:ring-teal-500/20 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">Menghitung status pengiriman...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card-modern p-16 text-center flex flex-col items-center justify-center border-dashed border-2 bg-slate-50/50">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </div>
          <h3 className="text-lg font-black text-slate-700">Tidak ada pengiriman</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Belum ada Surat Jalan yang diterbitkan dari modul Sales Order.</p>
        </div>
      ) : (
        <>
          {/* ==========================================
              TAMPILAN DESKTOP (TABEL MODERN)
              ========================================== */}
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
                      <td className="p-4">
                        <div className="font-mono text-sm font-black text-teal-700">{doItem.do_number}</div>
                      </td>
                      <td className="p-4">
                        <div className="inline-block bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-mono font-bold text-slate-600 shadow-sm">
                          {doItem.sales_orders?.so_number || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-700">
                        {new Date(doItem.delivery_date || doItem.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-sm font-black text-slate-800 uppercase">
                        {doItem.sales_orders?.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={doItem.calculatedStatus} />
                      </td>
                      <td className="p-4 text-center">
                        <Link 
                          href={`/dashboard/delivery-orders/${doItem.id}`} 
                          className="text-xs font-bold text-teal-700 bg-white border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 px-4 py-2 rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5 w-full justify-center"
                        >
                          Buka
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==========================================
              TAMPILAN MOBILE (KARTU ELEGAN)
              ========================================== */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((doItem) => (
              <div key={doItem.id} className="card-modern p-5 flex flex-col gap-4 relative border-l-4 border-l-teal-500">
                
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <div className="font-mono text-sm font-black text-teal-700">{doItem.do_number}</div>
                    <div className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(doItem.delivery_date || doItem.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase mb-2">
                    {doItem.sales_orders?.customers?.company_name || <span className="text-rose-400 italic">Klien Terhapus</span>}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-600">
                      SO: {doItem.sales_orders?.so_number || '-'}
                    </span>
                    <StatusBadge status={doItem.calculatedStatus} />
                  </div>
                </div>

                <div className="pt-2 mt-1">
                  <Link 
                    href={`/dashboard/delivery-orders/${doItem.id}`} 
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-600 hover:text-white px-4 py-3 rounded-xl transition-colors shadow-sm"
                  >
                    Buka Detail DO
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
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