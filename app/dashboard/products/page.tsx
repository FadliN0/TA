'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SmartPasteProduct from './SmartPasteProduct'; 
import Link from 'next/link';
import Modal from '@/components/ui/Modal';

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

    const productChannel = supabase
      .channel('katalog-produk-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Ada perubahan data dari Supabase!', payload);
          fetchProducts();
        }
      )
      .subscribe();
      return () => {
        supabase.removeChannel(productChannel);
      };
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
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', formData.id);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchProducts();
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
      fetchProducts();
    } catch (error: any) {
      alert('Gagal menghapus. Produk ini mungkin sedang digunakan di dokumen transaksi.');
    }
  };

  const fmtRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Master Data Produk</h1>
          <p className="text-sm text-slate-500">Kelola katalog barang dan spare part CV HJP.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SmartPasteProduct />
          
          <Link href="/dashboard/products/add" className="btn-primary w-full md:w-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Manual
          </Link>
        </div>
      </div>

      {/* PENCARIAN */}
      <div className="card-modern p-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cari Part Code atau Deskripsi Produk..." 
            className="input-modern pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Memuat katalog...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="card-modern p-10 text-center text-slate-500">Barang tidak ditemukan.</div>
      ) : (
        <>
          {/* ==========================================
              TAMPILAN DESKTOP (TABEL)
              ========================================== */}
          <div className="hidden md:block card-modern">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 label-modern">Part Code</th>
                  <th className="p-4 label-modern">Description</th>
                  <th className="p-4 label-modern text-center">Unit</th>
                  <th className="p-4 label-modern text-right">Base Price</th>
                  <th className="p-4 label-modern">Remark</th>
                  <th className="p-4 label-modern text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-blue-700">{p.part_code}</td>
                    <td className="p-4 font-bold text-slate-800">{p.part_name}</td>
                    <td className="p-4 text-center text-slate-600">{p.unit}</td>
                    <td className="p-4 font-black text-slate-800 text-right">{fmtRp(p.price)}</td>
                    <td className="p-4 text-slate-500">{p.remark || '-'}</td>
                    <td className="p-4 text-center space-x-4">
                      <button onClick={() => openModal('edit', p)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wide">Edit</button>
                      <button onClick={() => handleDelete(p.id, p.part_name)} className="text-rose-500 hover:text-rose-700 font-bold text-xs uppercase tracking-wide">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ==========================================
              TAMPILAN MOBILE (KARTU)
              ========================================== */}
          <div className="md:hidden space-y-4">
            {filteredProducts.map((p) => (
              <div key={p.id} className="card-modern p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="badge-neutral mb-2">{p.part_code}</span>
                    <h3 className="font-bold text-slate-800 leading-tight">{p.part_name}</h3>
                  </div>
                  <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{fmtRp(p.price)}</span>
                </div>
                
                <p className="text-xs text-slate-500">{p.remark || 'Tidak ada keterangan'}</p>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-1">
                  <span className="text-xs text-slate-500 font-bold">Satuan: <span className="text-slate-800">{p.unit}</span></span>
                  <div className="flex gap-4">
                    <button onClick={() => openModal('edit', p)} className="text-xs font-bold text-blue-600">Edit</button>
                    <button onClick={() => handleDelete(p.id, p.part_name)} className="text-xs font-bold text-rose-500">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ==========================================
          MODAL COMPONENT ADD/EDIT
          ========================================== */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'add' ? 'Tambah Produk Baru' : 'Edit Produk'}
        footer={
          <>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Batal</button>
            {/* Pakai form="productForm" agar tombol di luar tag form bisa trigger submit */}
            <button type="submit" form="productForm" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </>
        }
      >
        <form id="productForm" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-modern">Part Code / Number</label>
            <input type="text" required value={formData.part_code} onChange={e => setFormData({...formData, part_code: e.target.value})} className="input-modern font-mono" placeholder="Contoh: 11841523" />
          </div>
          <div>
            <label className="label-modern">Description (Nama Part)</label>
            <input type="text" required value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})} className="input-modern" placeholder="Contoh: Expansion Valve" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-modern">Unit (Satuan)</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="input-modern">
                <option value="PCS">PCS</option>
                <option value="UNIT">UNIT</option>
                <option value="SET">SET</option>
                <option value="Ltr">Ltr</option>
              </select>
            </div>
            <div>
              <label className="label-modern">Base Price (Rp)</label>
              <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="input-modern" />
            </div>
          </div>
          <div>
            <label className="label-modern">Default Remark / Keterangan</label>
            <input type="text" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} className="input-modern" placeholder="Contoh: OEM China" />
          </div>
        </form>
      </Modal>

    </div>
  );
}