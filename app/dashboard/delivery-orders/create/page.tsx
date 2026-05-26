'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function CreateDOForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const so_id = searchParams.get('so_id');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [itemsToDeliver, setItemsToDeliver] = useState<any[]>([]);

  useEffect(() => {
    if (so_id) fetchBackorderData();
  }, [so_id]);

  const fetchBackorderData = async () => {
    setLoading(true);
    try {
      const { data: soData, error: soErr } = await supabase
        .from('sales_orders')
        .select('*, customers(company_name), customer_addresses(complete_address, pic_name)')
        .eq('id', so_id)
        .single();
      if (soErr) throw soErr;
      setSalesOrder(soData);

      const { data: backorders, error: boErr } = await supabase.rpc('get_remaining_backorder', { p_so_id: so_id });
      if (boErr) throw boErr;

      if (!backorders || backorders.length === 0) {
        alert('Semua barang di pesanan ini sudah terkirim (Tidak ada sisa/backorder).');
        router.push(`/dashboard/sales-orders/${so_id}`);
        return;
      }

      const soItemIds = backorders.map((b: any) => b.so_item_id);
      const { data: itemDetails } = await supabase
        .from('sales_order_items')
        .select('id, products(part_code, part_name, unit)')
        .in('id', soItemIds);

      const mergedItems = backorders.map((bo: any) => {
        const detail = itemDetails?.find(i => i.id === bo.so_item_id);
        const productInfo = Array.isArray(detail?.products) ? detail?.products[0] : detail?.products;

        return {
          ...bo,
          part_code: productInfo?.part_code || '-',
          part_name: productInfo?.part_name || 'Unknown Part',
          unit: productInfo?.unit || 'PCS',
          qty_to_deliver: bo.remaining_qty 
        };
      });

      setItemsToDeliver(mergedItems);
    } catch (error) {
      console.error('Error fetching backorder:', error);
      alert('Gagal memuat sisa pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index: number, val: number) => {
    const newItems = [...itemsToDeliver];
    const maxQty = newItems[index].remaining_qty;
    let cleanVal = val;
    if (cleanVal > maxQty) cleanVal = maxQty;
    if (cleanVal < 0) cleanVal = 0;
    newItems[index].qty_to_deliver = cleanVal;
    setItemsToDeliver(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter hanya barang yang jumlah kirimnya lebih dari 0
    const finalItems = itemsToDeliver.filter(item => item.qty_to_deliver > 0);
    if (finalItems.length === 0) {
      alert('Isi minimal 1 barang yang dikirim sekarang!');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Siapkan data hari ini
      const today = new Date().toISOString().split('T')[0];

      // 2. Petakan array items ke format JSON yang diminta Database
      const itemsPayload = finalItems.map(i => ({
        so_item_id: i.so_item_id,
        qty_delivered: i.qty_to_deliver
      }));

      // 3. Panggil Stored Procedure, Database akan melakukan keajaibannya!
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_do_transaction', {
        p_so_id: so_id,
        p_address_id: salesOrder.address_id,
        p_delivery_date: today,
        p_items: itemsPayload
      });

      if (rpcError) throw rpcError;

      // 4. Berhasil! Arahkan ke halaman detail DO yang baru terbuat
      router.push(`/dashboard/delivery-orders/${rpcData.do_id}`);
      
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message || error.details}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold animate-pulse">Mengecek sisa pesanan...</p>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-teal-600">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Proses Surat Jalan (DO)</h1>
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-teal-700">{salesOrder?.so_number}</span>
            • {salesOrder?.customers?.company_name}
          </p>
        </div>
        <Link href={`/dashboard/sales-orders/${so_id}`} className="btn-secondary">
          Batal & Kembali
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* INFO BOX */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 shadow-sm">
          <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="text-sm">
            <p className="font-black uppercase tracking-wider mb-1">Mode Pengiriman Parsial</p>
            <p>Masukkan jumlah barang yang akan dikirim hari ini pada kolom <b>"Kirim Sekarang"</b>. Sistem akan mencatat sisanya sebagai <i>backorder</i> jika tidak dikirim penuh.</p>
          </div>
        </div>

        {/* TABEL BARANG (RESPONSIVE CARD ON MOBILE) */}
        <div className="card-modern overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400">Part Info</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center">Qty Pesanan</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center">Terkirim</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center text-rose-500">Sisa (BO)</th>
                  <th className="p-4 text-[10px] font-black uppercase text-teal-600 text-center w-48">Kirim Sekarang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsToDeliver.map((item, index) => (
                  <tr key={item.so_item_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-800">{item.part_code}</div>
                      <div className="text-xs text-slate-500">{item.part_name}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-600 bg-slate-50/50">{item.ordered_qty}</td>
                    <td className="p-4 text-center font-bold text-emerald-600">{item.delivered_qty}</td>
                    <td className="p-4 text-center font-bold text-rose-600 bg-rose-50/30">{item.remaining_qty}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          min="0"
                          max={item.remaining_qty}
                          value={item.qty_to_deliver}
                          onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-teal-200 rounded-xl p-2.5 text-center font-black text-teal-800 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER ACTION */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 text-white font-black px-10 py-4 rounded-2xl shadow-lg shadow-teal-900/20 disabled:bg-slate-300 transition-all active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                TERBITKAN SURAT JALAN
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DeliveryOrderCreatePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
      </div>
    }>
      <CreateDOForm />
    </Suspense>
  );
}