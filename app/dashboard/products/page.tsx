'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // State untuk Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);

  // State Form Input
  const [formData, setFormData] = useState({
    id: '',
    part_code: '',
    part_name: '',
    unit: 'PCS',
    price: 0,
    remark: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('part_code', { ascending: true });
      
      if (error) throw error;
      if (data) setProducts(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.part_code?.toLowerCase().includes(search.toLowerCase()) ||
    p.part_name?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit', product: any = null) => {
    setModalMode(mode);
    if (mode === 'edit' && product) {
      setFormData({
        id: product.id,
        part_code: product.part_code || '',
        part_name: product.part_name || '',
        unit: product.unit || 'PCS',
        price: product.price || 0,
        remark: product.remark || ''
      });
    } else {
      setFormData({ id: '', part_code: '', part_name: '', unit: 'PCS', price: 0, remark: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        part_code: formData.part_code,
        part_name: formData.part_name,
        unit: formData.unit,
        price: formData.price,
        remark: formData.remark
      };

      if (modalMode === 'add') {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        alert('Produk berhasil ditambahkan!');
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', formData.id);
        if (error) throw error;
        alert('Produk berhasil diperbarui!');
      }

      setIsModalOpen(false);
      fetchProducts(); // Refresh tabel
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, part_name: string) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${part_name}"? \nCatatan: Produk yang sudah pernah ditransaksikan tidak bisa dihapus.`)) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      alert('Produk dihapus!');
      fetchProducts();
    } catch (error: any) {
      alert('Gagal menghapus. Produk ini mungkin sedang digunakan di dokumen transaksi.');
    }
  };

  const fmtRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Master Data Produk</h1>
          <p className="text-sm text-gray-500">Kelola katalog barang dan spare part CV HJP.</p>
        </div>
        <button 
          onClick={() => openModal('add')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow flex items-center gap-2"
        >
          + Tambah Produk Baru
        </button>
      </div>

      {/* Kotak Pencarian */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input 
          type="text" 
          placeholder="Cari Part Code atau Deskripsi Produk..." 
          className="w-full border p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabel Produk */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Part Code</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Description</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Unit</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Base Price</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Remark (Default)</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Memuat katalog...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Barang tidak ditemukan.</td></tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-mono text-sm font-bold text-blue-700">{p.part_code}</td>
                    <td className="p-4 text-sm font-bold text-gray-800">{p.part_name}</td>
                    <td className="p-4 text-sm text-center text-gray-600">{p.unit}</td>
                    <td className="p-4 text-sm font-black text-gray-800 text-right">{fmtRp(p.price)}</td>
                    <td className="p-4 text-sm text-gray-500">{p.remark || '-'}</td>
                    <td className="p-4 text-center space-x-3">
                      <button onClick={() => openModal('edit', p)} className="text-blue-600 hover:text-blue-800 font-bold text-sm">Edit</button>
                      <button onClick={() => handleDelete(p.id, p.part_name)} className="text-red-500 hover:text-red-700 font-bold text-sm">Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === MODAL ADD/EDIT === */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-4 text-white">
              <h2 className="text-xl font-bold">{modalMode === 'add' ? 'Tambah Produk Baru' : 'Edit Produk'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Part Code / Number</label>
                <input type="text" required value={formData.part_code} onChange={e => setFormData({...formData, part_code: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-blue-500 outline-none font-mono text-sm" placeholder="Contoh: 11841523" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Description (Nama Part)</label>
                <input type="text" required value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-blue-500 outline-none text-sm" placeholder="Contoh: Expansion Valve" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Unit (Satuan)</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 outline-none text-sm">
                    <option value="PCS">PCS</option>
                    <option value="UNIT">UNIT</option>
                    <option value="SET">SET</option>
                    <option value="Ltr">Ltr</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Base Price (Rp)</label>
                  <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Default Remark / Keterangan</label>
                <input type="text" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-blue-500 outline-none text-sm" placeholder="Contoh: OEM China" />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow disabled:bg-blue-300">
                {isSaving ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}