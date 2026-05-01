'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);

  // State Form Gabungan: Perusahaan + ARRAY Alamat
  const [formData, setFormData] = useState({
    id: '',
    company_name: '',
    email: '',
    phone: '',
    addresses: [
      { id: '', address_type: 'Billing', pic_name: '', pic_phone: '', complete_address: '', is_default: true }
    ]
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_addresses (*)`)
        .order('company_name', { ascending: true });
      
      if (error) throw error;
      if (data) setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_addresses?.some((addr: any) => addr.pic_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const openModal = (mode: 'add' | 'edit', customer: any = null) => {
    setModalMode(mode);
    if (mode === 'edit' && customer) {
      // Jika punya alamat di DB, load semuanya. Jika tidak, beri 1 form kosong.
      const addrs = customer.customer_addresses?.length > 0 
        ? customer.customer_addresses 
        : [{ id: '', address_type: 'Billing', pic_name: '', pic_phone: '', complete_address: '', is_default: true }];

      setFormData({
        id: customer.id,
        company_name: customer.company_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        addresses: addrs
      });
    } else {
      setFormData({
        id: '', company_name: '', email: '', phone: '',
        addresses: [{ id: '', address_type: 'Billing', pic_name: '', pic_phone: '', complete_address: '', is_default: true }]
      });
    }
    setIsModalOpen(true);
  };

  // === FUNGSI DINAMIS UNTUK ALAMAT ===
  const addAddressField = () => {
    setFormData({
      ...formData,
      addresses: [
        ...formData.addresses,
        { id: '', address_type: 'Shipping', pic_name: '', pic_phone: '', complete_address: '', is_default: false }
      ]
    });
  };

  const removeAddressField = (indexToRemove: number) => {
    const newAddresses = formData.addresses.filter((_, index) => index !== indexToRemove);
    setFormData({ ...formData, addresses: newAddresses });
  };

  const updateAddressField = (index: number, field: string, value: any) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
  };
  // ===================================

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let currentCustomerId = formData.id;

      // 1. Simpan/Update Data Perusahaan (customers)
      if (modalMode === 'add') {
        const { data: newCustomer, error: custError } = await supabase.from('customers').insert([{
          company_name: formData.company_name,
          email: formData.email,
          phone: formData.phone
        }]).select().single();
        if (custError) throw custError;
        currentCustomerId = newCustomer.id;
      } else {
        const { error: custError } = await supabase.from('customers').update({
          company_name: formData.company_name,
          email: formData.email,
          phone: formData.phone
        }).eq('id', currentCustomerId);
        if (custError) throw custError;
      }

      // 2. Simpan/Update Data Banyak Alamat (DIPISAH AGAR SUPABASE TIDAK BINGUNG)
      const addressesToUpdate: any[] = [];
      const addressesToInsert: any[] = [];

      formData.addresses.forEach(addr => {
        const payload = {
          customer_id: currentCustomerId,
          address_type: addr.address_type,
          pic_name: addr.pic_name,
          pic_phone: addr.pic_phone,
          complete_address: addr.complete_address,
          is_default: addr.is_default
        };

        if (addr.id) {
          // Jika sudah punya ID, masukkan ke antrean Update
          addressesToUpdate.push({ ...payload, id: addr.id });
        } else {
          // Jika belum punya ID (alamat baru), masukkan ke antrean Insert
          addressesToInsert.push(payload);
        }
      });

      // Jalankan operasi Update untuk alamat lama
      if (addressesToUpdate.length > 0) {
        const { error: updateError } = await supabase.from('customer_addresses').upsert(addressesToUpdate);
        if (updateError) throw updateError;
      }

      // Jalankan operasi Insert untuk alamat baru (database akan otomatis membuatkan UUID)
      if (addressesToInsert.length > 0) {
        const { error: insertError } = await supabase.from('customer_addresses').insert(addressesToInsert);
        if (insertError) throw insertError;
      }

      alert(modalMode === 'add' ? 'Pelanggan berhasil ditambahkan!' : 'Data pelanggan berhasil diperbarui!');
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, company_name: string) => {
    if (!window.confirm(`Yakin ingin menghapus perusahaan "${company_name}" beserta semua alamatnya? \n(Akan ditolak oleh sistem jika klien ini sudah punya riwayat transaksi)`)) return;
    try {
      // Hapus alamatnya dulu
      await supabase.from('customer_addresses').delete().eq('customer_id', id);
      // Hapus perusahaannya
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      alert('Pelanggan dihapus!');
      fetchCustomers();
    } catch (error: any) {
      alert('Gagal menghapus. Pelanggan ini sedang digunakan di dokumen transaksi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* KONTROL ATAS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Master Data Pelanggan</h1>
          <p className="text-sm text-gray-500">Kelola daftar klien/perusahaan (B2B) dan Multi-Alamat pengiriman.</p>
        </div>
        <button 
          onClick={() => openModal('add')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow flex items-center gap-2"
        >
          + Tambah Pelanggan
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input 
          type="text" 
          placeholder="Cari Nama Perusahaan atau Nama PIC..." 
          className="w-full border p-2.5 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABEL PELANGGAN */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Perusahaan</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Kontak Kantor</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Daftar Alamat & PIC</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Memuat daftar pelanggan...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Data pelanggan tidak ditemukan.</td></tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-800 uppercase align-top">{c.company_name}</td>
                    <td className="p-4 text-sm text-gray-600 align-top">
                      <div>{c.email || '-'}</div>
                      <div>{c.phone || '-'}</div>
                    </td>
                    <td className="p-4 text-sm align-top">
                      {/* Mapping semua alamat yang dimiliki PT ini */}
                      <div className="space-y-3">
                        {c.customer_addresses?.map((addr: any, idx: number) => (
                          <div key={addr.id || idx} className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${addr.address_type?.toLowerCase() === 'billing' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {addr.address_type}
                              </span>
                              <span className="font-bold text-gray-700">{addr.pic_name} ({addr.pic_phone})</span>
                            </div>
                            <div className="text-gray-600">{addr.complete_address}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center align-top space-x-3">
                      <button onClick={() => openModal('edit', c)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm">Edit</button>
                      <button onClick={() => handleDelete(c.id, c.company_name)} className="text-red-500 hover:text-red-700 font-bold text-sm">Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === MODAL ADD/EDIT MULTI ADDRESS === */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-4 text-white shrink-0 flex justify-between items-center">
              <h2 className="text-xl font-bold">{modalMode === 'add' ? 'Tambah Pelanggan Baru' : 'Edit Pelanggan'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-gray-50/50">
              
              {/* === IDENTITAS PT === */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 border-b pb-2 mb-3">1. Identitas Perusahaan Utama</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nama Perusahaan (B2B)</label>
                    <input type="text" required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-emerald-500 outline-none text-sm font-bold uppercase" placeholder="PT. ANCARA COAL TERMINAL" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Email Kantor</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-emerald-500 outline-none text-sm" placeholder="info@perusahaan.com" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Telp Kantor</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-gray-200 rounded p-2 mt-1 focus:border-emerald-500 outline-none text-sm" placeholder="(021) 1234567" />
                    </div>
                  </div>
                </div>
              </div>

              {/* === ARRAY ALAMAT === */}
              <div>
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <h3 className="text-sm font-black text-gray-800">2. Daftar Alamat & PIC Klien</h3>
                  <button type="button" onClick={addAddressField} className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">
                    + Tambah Alamat Lain
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.addresses.map((addr, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 relative group hover:border-emerald-400 transition-colors">
                      
                      {/* Tombol Hapus Alamat (Jangan izinkan hapus alamat pertama) */}
                      {index > 0 && (
                        <button type="button" onClick={() => removeAddressField(index)} className="absolute top-2 right-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200">
                          Hapus Blok Ini
                        </button>
                      )}

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="col-span-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Tipe Alamat</label>
                          <select 
                            value={addr.address_type} 
                            onChange={(e) => updateAddressField(index, 'address_type', e.target.value)} 
                            className="w-full border-2 border-gray-200 rounded p-2 mt-1 outline-none text-sm font-bold text-gray-700"
                          >
                            <option value="Billing">Billing (Kantor Pusat)</option>
                            <option value="Shipping">Shipping (Site/Gudang)</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Nama PIC</label>
                          <input type="text" required value={addr.pic_name} onChange={(e) => updateAddressField(index, 'pic_name', e.target.value)} className="w-full border-2 border-gray-200 rounded p-2 mt-1 outline-none text-sm" placeholder="Nama PIC" />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">No HP PIC</label>
                          <input type="text" required value={addr.pic_phone} onChange={(e) => updateAddressField(index, 'pic_phone', e.target.value)} className="w-full border-2 border-gray-200 rounded p-2 mt-1 outline-none text-sm" placeholder="0812..." />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Alamat Lengkap Site / Kantor</label>
                        <textarea required rows={2} value={addr.complete_address} onChange={(e) => updateAddressField(index, 'complete_address', e.target.value)} className="w-full border-2 border-gray-200 rounded p-2 mt-1 outline-none text-sm resize-none" placeholder="Jln. Raya Proyek Site A..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow disabled:bg-emerald-300">
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Data'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}