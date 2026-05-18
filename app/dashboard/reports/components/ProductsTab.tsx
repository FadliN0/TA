'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

// --- Utility Functions Khusus Tab Barang ---
const fmtRp = (num: number) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

const downloadBlob = (headers: string[], rows: any[][], filename: string) => {
  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
};

export default function ProductsTab({ customersList }: { customersList: any[] }) {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCustomerId, setSelectedProductCustomerId] = useState('');
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [hasSearchedProduct, setHasSearchedProduct] = useState(false);

  const fetchProductHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productSearch.trim() && !selectedProductCustomerId) {
      return alert('Silakan pilih Klien atau ketik nama barang untuk mencari!');
    }
    
    setProductLoading(true);
    setHasSearchedProduct(true);
    try {
      let query = supabase.from('sales_order_items').select(`
        qty, unit_price, total_price,
        products!inner(part_code, part_name, unit),
        sales_orders!inner(so_number, created_at, customer_id, customers(company_name)) 
      `);
      
      if (productSearch.trim()) {
        query = query.or(`part_code.ilike.%${productSearch}%,part_name.ilike.%${productSearch}%`, { foreignTable: 'products' });
      }
      if (selectedProductCustomerId) {
        query = query.eq('sales_orders.customer_id', selectedProductCustomerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const sortedData = (data || []).sort((a: any, b: any) => 
        new Date(b.sales_orders?.created_at).getTime() - new Date(a.sales_orders?.created_at).getTime()
      );
      setProductHistory(sortedData);
    } catch (error: any) {
      alert(`Gagal menarik riwayat barang: ${error.message}`);
    } finally {
      setProductLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Tanggal', 'Klien', 'No. SO', 'Part Number', 'Nama Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Total Harga'];
    const rows = productHistory.map(item => [
      new Date(item.sales_orders?.created_at).toLocaleDateString('id-ID'), `"${item.sales_orders?.customers?.company_name || '-'}"`,
      item.sales_orders?.so_number, `"${item.products?.part_code}"`, `"${item.products?.part_name}"`, item.qty,
      item.products?.unit, item.unit_price, item.total_price
    ]);
    downloadBlob(headers, rows, `Riwayat_Barang_${productSearch || 'Klien'}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-emerald-900">Tarik Rincian Barang per Klien</h2>
        <form onSubmit={fetchProductHistory} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Filter Klien (Opsional)</label>
            <select value={selectedProductCustomerId} onChange={(e) => setSelectedProductCustomerId(e.target.value)} className="input-modern w-full font-bold text-emerald-900 focus:border-emerald-500 bg-white">
              <option value="">-- Semua Klien --</option>
              {customersList.map(cust => (<option key={cust.id} value={cust.id}>{cust.company_name}</option>))}
            </select>
          </div>
          <div className="w-full md:w-auto flex-1 relative">
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Cari Barang (Opsional)</label>
            <input type="text" placeholder="Ketik Part Number (PN) atau Nama Barang..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="input-modern w-full pl-3 text-emerald-900 font-bold focus:border-emerald-500 bg-white" />
          </div>
          <button type="submit" disabled={productLoading} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:bg-emerald-300 shadow-sm h-[48px]">
            {productLoading ? 'Menarik...' : 'Tarik Rincian'}
          </button>
        </form>
      </div>

      {hasSearchedProduct && (
        <div className="card-modern overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <span className="font-black text-slate-800 text-lg">
              {productHistory.length > 0 ? `${productHistory.length} Riwayat Ditemukan` : 'Tidak ada riwayat.'}
            </span>
            {productHistory.length > 0 && (
              <button onClick={exportCSV} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm">
                📥 Export CSV
              </button>
            )}
          </div>
          {productHistory.length > 0 && (
            <div className="overflow-x-auto max-h-[65vh] custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 font-black text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-inner">
                  <tr>
                    <th className="p-4 border-b">Tanggal</th>
                    <th className="p-4 border-b">Klien</th>
                    <th className="p-4 border-b">No. SO</th>
                    <th className="p-4 border-b">Barang</th>
                    <th className="p-4 border-b text-center">Qty</th>
                    <th className="p-4 border-b text-right">Harga Jual</th>
                    <th className="p-4 border-b text-right">Total Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-600">{new Date(item.sales_orders?.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 font-black text-slate-900 uppercase">{item.sales_orders?.customers?.company_name}</td>
                      <td className="p-4 font-mono font-bold text-blue-600 text-xs">{item.sales_orders?.so_number}</td>
                      <td className="p-4">
                        <div className="font-mono font-black text-slate-800">{item.products?.part_code}</div>
                        <div className="text-xs text-slate-500 font-semibold">{item.products?.part_name}</div>
                      </td>
                      <td className="p-4 text-center font-black text-emerald-600">{item.qty} {item.products?.unit}</td>
                      <td className="p-4 text-right font-medium text-slate-600">{fmtRp(item.unit_price)}</td>
                      <td className="p-4 text-right font-black text-slate-900">{fmtRp(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}