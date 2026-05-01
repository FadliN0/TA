'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AddProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    part_code: '',
    part_name: '',
    unit: 'PCS',
    price: 0,
    remark: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: dbError } = await supabase.from('products').insert([form]);

      if (dbError) {
        // Menangani error jika Part Code sudah ada (Unique Constraint)
        if (dbError.code === '23505') {
          throw new Error('Part Code ini sudah terdaftar di database. Gunakan kode lain.');
        }
        throw dbError;
      }

      router.push('/dashboard/products'); // Asumsi Anda punya halaman daftar produk
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data produk.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tambah Suku Cadang Baru</h1>
        <Link href="/dashboard/products" className="text-sm text-blue-600 hover:underline">
          Kembali ke Daftar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Part Code (Unik)</label>
            <input required type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500 font-mono bg-gray-50" 
              placeholder="Contoh: 14X-27-15112"
              value={form.part_code}
              onChange={e => setForm({...form, part_code: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Satuan (Unit)</label>
            <select required className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
              value={form.unit}
              onChange={e => setForm({...form, unit: e.target.value})}>
              <option value="PCS">PCS</option>
              <option value="SET">SET</option>
              <option value="ASSY">ASSY</option>
              <option value="BOX">BOX</option>
              <option value="LITER">LITER</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Part Name (Deskripsi Lengkap)</label>
          <input required type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
            placeholder="Contoh: Bushing Komatsu D155"
            value={form.part_name}
            onChange={e => setForm({...form, part_name: e.target.value})} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Harga Jual (Rp)</label>
          <input required type="number" min="0" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
            value={form.price}
            onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Remark (Catatan Tambahan)</label>
          <textarea className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" rows={3}
            placeholder="Contoh: Barang Original, Garansi 1 Bulan (Opsional)"
            value={form.remark}
            onChange={e => setForm({...form, remark: e.target.value})} />
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-bold disabled:bg-blue-300 transition-colors">
            {isLoading ? 'Menyimpan...' : 'Simpan Produk'}
          </button>
        </div>
      </form>
    </div>
  );
}