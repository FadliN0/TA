'use client';

import { useState } from 'react';
import TransactionsTab from './components/TransactionsTab';
import ProductsTab from './components/ProductsTab';

export default function ReportsClient({
  initialCustomers,
}: {
  initialCustomers: any[];
}) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'products'>(
    'transactions',
  );
  const customersList = initialCustomers;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto text-black">
      {/* HEADER BANNER & NAVIGASI TAB */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-l-4 border-l-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Pusat Laporan Eksekutif
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Pantau pergerakan transaksi dan riwayat penjualan barang CV HJP.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-black transition-all ${
              activeTab === 'transactions'
                ? 'bg-white shadow-sm text-blue-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📊 Laporan Transaksi (SO)
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-black transition-all ${
              activeTab === 'products'
                ? 'bg-white shadow-sm text-emerald-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📦 Riwayat Barang
          </button>
        </div>
      </div>

      {/* RENDER KOMPONEN BERDASARKAN TAB YANG AKTIF */}
      {activeTab === 'transactions' ? (
        <TransactionsTab customersList={customersList} />
      ) : (
        <ProductsTab customersList={customersList} />
      )}
    </div>
  );
}