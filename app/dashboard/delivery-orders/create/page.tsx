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
      // 1. Tarik info header SO
      const { data: soData, error: soErr } = await supabase
        .from('sales_orders')
        .select('*, customers(company_name), customer_addresses(complete_address, pic_name)')
        .eq('id', so_id)
        .single();
      if (soErr) throw soErr;
      setSalesOrder(soData);

      // 2. EKSEKUSI FUNCTION DATABASE MU: Cek sisa Backorder!
      const { data: backorders, error: boErr } = await supabase.rpc('get_remaining_backorder', { p_so_id: so_id });
      if (boErr) throw boErr;

      if (!backorders || backorders.length === 0) {
        alert('Semua barang di pesanan ini sudah terkirim (Tidak ada backorder).');
        router.push(`/dashboard/sales-orders/${so_id}`);
        return;
      }

      // 3. Tarik detail nama barang untuk ditampilkan di tabel
      const soItemIds = backorders.map((b: any) => b.so_item_id);
      const { data: itemDetails } = await supabase
        .from('sales_order_items')
        .select('id, products(part_code, part_name, unit)')
        .in('id', soItemIds);

      // 4. Gabungkan data backorder dengan detail nama produk
      const mergedItems = backorders.map((bo: any) => {
        const detail = itemDetails?.find(i => i.id === bo.so_item_id);
        
        // Jika Supabase mengembalikan array, ambil index [0]. Jika objek, ambil langsung.
        const productInfo = Array.isArray(detail?.products) 
          ? detail?.products[0] 
          : detail?.products;

        return {
          ...bo,
          part_code: productInfo?.part_code || '-',
          part_name: productInfo?.part_name || 'Unknown Part',
          unit: productInfo?.unit || 'PCS',
          qty_to_deliver: bo.remaining_qty // Default: Isi penuh sesuai sisa
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
    
    // Validasi agar tidak melebihi sisa pesanan & tidak minus
    let cleanVal = val;
    if (cleanVal > maxQty) cleanVal = maxQty;
    if (cleanVal < 0) cleanVal = 0;

    newItems[index].qty_to_deliver = cleanVal;
    setItemsToDeliver(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter barang yang quantity-nya diisi lebih dari 0
    const finalItems = itemsToDeliver.filter(item => item.qty_to_deliver > 0);
    
    if (finalItems.length === 0) {
      alert('Anda harus mengisi setidaknya 1 barang untuk dikirim!');
      return;
    }

    setIsSaving(true);
    try {
      // Generate DO Number
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const prefix = `DO/${dd}-${mm}-${yyyy}/`;

      const { data: lastDoc } = await supabase.from('delivery_orders')
        .select('do_number').like('do_number', `${prefix}%`).order('do_number', { ascending: false }).limit(1);
      
      let nextSeq = 1;
      if (lastDoc && lastDoc.length > 0) {
        const lastPart = lastDoc[0].do_number.split('/').pop();
        nextSeq = parseInt(lastPart || '0') + 1;
      }
      const newDoNumber = `${prefix}${nextSeq}`;

      // Insert Header
      const { data: doData, error: doErr } = await supabase.from('delivery_orders').insert([{
        do_number: newDoNumber,
        so_id: so_id,
        address_id: salesOrder.address_id,
        delivery_date: today.toISOString().split('T')[0],
        status: 'Delivered'
      }]).select().single();

      if (doErr) throw doErr;

      // Insert Items
      const itemsToInsert = finalItems.map(i => ({
        do_id: doData.id,
        so_item_id: i.so_item_id,
        qty_delivered: i.qty_to_deliver
      }));

      const { error: itemErr } = await supabase.from('delivery_order_items').insert(itemsToInsert);
      if (itemErr) throw itemErr;

      // Sukses! Trigger DB mu akan otomatis mengubah status SO menjadi Partial/Completed
      router.push(`/dashboard/delivery-orders/${doData.id}`);
      
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Mengecek sisa pesanan (backorder)...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Proses Surat Jalan (DO)</h1>
          <p className="text-sm text-gray-500">Ref SO: {salesOrder?.so_number} - {salesOrder?.customers?.company_name}</p>
        </div>
        <Link href={`/dashboard/sales-orders/${so_id}`} className="text-blue-600 text-sm">Batal</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-sm text-yellow-800">
          <strong>Mode Pengiriman Parsial:</strong> Sesuaikan angka pada kolom <b>"Kirim Sekarang"</b> jika barang belum bisa dikirim sepenuhnya. Kosongkan angka (0) jika barang tersebut tidak ikut dikirim hari ini.
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-xs uppercase text-gray-500 font-bold border-b">Part Number</th>
              <th className="p-3 text-xs uppercase text-gray-500 font-bold border-b">Nama Barang</th>
              <th className="p-3 text-xs uppercase text-gray-500 font-bold border-b text-center">Total Pesan</th>
              <th className="p-3 text-xs uppercase text-gray-500 font-bold border-b text-center text-green-600">Sudah Kirim</th>
              <th className="p-3 text-xs uppercase text-gray-500 font-bold border-b text-center text-red-600">Sisa (Backorder)</th>
              <th className="p-3 text-xs uppercase text-blue-600 font-black border-b text-center w-40">Kirim Sekarang</th>
            </tr>
          </thead>
          <tbody>
            {itemsToDeliver.map((item, index) => (
              <tr key={item.so_item_id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-mono font-bold">{item.part_code}</td>
                <td className="p-3 text-sm">{item.part_name}</td>
                <td className="p-3 text-sm text-center font-bold bg-gray-50">{item.ordered_qty}</td>
                <td className="p-3 text-sm text-center font-bold text-green-700 bg-green-50/30">{item.delivered_qty}</td>
                <td className="p-3 text-sm text-center font-bold text-red-600 bg-red-50/30">{item.remaining_qty}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="0"
                      max={item.remaining_qty}
                      value={item.qty_to_deliver}
                      onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 0)}
                      className="w-full border-2 border-blue-300 rounded p-2 text-center font-bold text-blue-800 focus:outline-none focus:border-blue-600"
                    />
                    <span className="text-xs text-gray-500">{item.unit}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-lg shadow disabled:bg-teal-300"
          >
            {isSaving ? 'Menyimpan...' : 'TERBITKAN SURAT JALAN'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Dibungkus dengan Suspense karena menggunakan useSearchParams() dari Next.js
export default function DeliveryOrderCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat Form...</div>}>
      <CreateDOForm />
    </Suspense>
  );
}