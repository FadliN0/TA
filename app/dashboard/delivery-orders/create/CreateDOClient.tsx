'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createDeliveryOrderAction } from './actions';

export default function CreateDOClient({
  soId,
  salesOrder,
  availableAddresses,
  initialItems,
  preselectedAddressId,
}: {
  soId: string;
  salesOrder: any;
  availableAddresses: any[];
  initialItems: any[];
  preselectedAddressId: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [itemsToDeliver, setItemsToDeliver] = useState<any[]>(initialItems);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(preselectedAddressId);

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

    if (!selectedAddressId) {
      alert('Pilih alamat pengiriman terlebih dahulu!');
      return;
    }

    const finalItems = itemsToDeliver.filter((item) => item.qty_to_deliver > 0);
    if (finalItems.length === 0) {
      alert('Isi minimal 1 barang yang dikirim sekarang!');
      return;
    }

    setIsSaving(true);
    try {
      const itemsPayload = finalItems.map((i) => ({
        so_item_id: i.so_item_id,
        qty_delivered: i.qty_to_deliver,
      }));

      const res = await createDeliveryOrderAction(soId, selectedAddressId, itemsPayload);
      router.push(`/dashboard/delivery-orders/${res.do_id}`);
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAddress = availableAddresses.find((a) => a.id === selectedAddressId);

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
        <Link href={`/dashboard/sales-orders/${soId}`} className="btn-secondary">
          Batal & Kembali
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── SECTION 1: PILIH ALAMAT PENGIRIMAN ── */}
        <div className="card-modern p-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">1. Alamat Pengiriman (Ship To)</h2>
              <p className="text-xs text-slate-500 mt-1">Pilih lokasi tujuan pengiriman barang untuk DO ini.</p>
            </div>
          </div>

          {availableAddresses.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed rounded-xl">
              Tidak ada alamat terdaftar untuk pelanggan ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {availableAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 focus:outline-none group ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300 group-hover:border-teal-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3 pr-6">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        addr.address_type === 'Billing'
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-orange-100 text-orange-700 border-orange-200'
                      }`}>
                        {addr.address_type}
                      </span>
                      {addr.is_default && (
                        <span className="text-[9px] font-black bg-teal-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          ★ Utama
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-semibold leading-relaxed mb-3 ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                      {addr.complete_address}
                    </p>

                    <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {addr.pic_name}
                      {addr.pic_phone && <span className="text-slate-400 font-normal">• {addr.pic_phone}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedAddress && (
            <div className="mt-4 flex items-start gap-3 bg-teal-50 border border-teal-200 p-4 rounded-xl">
              <div className="mt-0.5 shrink-0 bg-teal-500 rounded-full p-1">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-0.5">Dikirim Ke</p>
                <p className="text-sm font-bold text-slate-800">{selectedAddress.complete_address}</p>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">
                  PIC: {selectedAddress.pic_name} {selectedAddress.pic_phone && `(${selectedAddress.pic_phone})`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── INFO BOX ── */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 shadow-sm">
          <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-black uppercase tracking-wider mb-1">2. Mode Pengiriman Parsial</p>
            <p>Masukkan jumlah barang yang akan dikirim hari ini pada kolom <b>"Kirim Sekarang"</b>. Sistem akan mencatat sisanya sebagai <i>backorder</i> jika tidak dikirim penuh.</p>
          </div>
        </div>

        {/* ── TABEL BARANG ── */}
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

        {/* ── FOOTER ACTION ── */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving || !selectedAddressId}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 text-white font-black px-10 py-4 rounded-2xl shadow-lg shadow-teal-900/20 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                TERBITKAN SURAT JALAN
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}