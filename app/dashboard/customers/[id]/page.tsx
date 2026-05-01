'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);

  // State untuk Modal Tambah/Edit Alamat
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  // State Form Alamat
  const [addressForm, setAddressForm] = useState({
    id: '', // Hanya terisi jika mode 'edit'
    address_type: 'Shipping',
    complete_address: '',
    pic_name: '',
    pic_phone: '',
    is_default: false
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: cust } = await supabase.from('customers').select('*').eq('id', id).single();
    const { data: addr } = await supabase.from('customer_addresses').select('*').eq('customer_id', id).order('is_default', { ascending: false });
    
    if (cust) setCustomer(cust);
    if (addr) setAddresses(addr);
    setLoading(false);
  };

  // Fungsi Buka Modal Tambah Baru
  const handleOpenAdd = () => {
    setModalMode('add');
    setAddressForm({
      id: '',
      address_type: 'Shipping', // Default kalau nambah baru biasanya shipping
      complete_address: '',
      pic_name: '',
      pic_phone: '',
      is_default: false
    });
    setIsModalOpen(true);
  };

  // Fungsi Buka Modal Edit
  const handleOpenEdit = (addr: any) => {
    setModalMode('edit');
    setAddressForm({
      id: addr.id,
      address_type: addr.address_type,
      complete_address: addr.complete_address,
      pic_name: addr.pic_name,
      pic_phone: addr.pic_phone,
      is_default: addr.is_default
    });
    setIsModalOpen(true);
  };

  // Fungsi Simpan (Tambah/Edit)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logika Eksklusif: Jika dicentang sebagai "Utama", kita harus mematikan "Utama" di alamat lain dulu
    if (addressForm.is_default) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', id);
    }

    if (modalMode === 'add') {
      const { error } = await supabase.from('customer_addresses').insert([{
        customer_id: id,
        address_type: addressForm.address_type,
        complete_address: addressForm.complete_address,
        pic_name: addressForm.pic_name,
        pic_phone: addressForm.pic_phone,
        is_default: addressForm.is_default
      }]);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('customer_addresses').update({
        address_type: addressForm.address_type,
        complete_address: addressForm.complete_address,
        pic_name: addressForm.pic_name,
        pic_phone: addressForm.pic_phone,
        is_default: addressForm.is_default
      }).eq('id', addressForm.id);
      if (error) alert(error.message);
    }

    setIsModalOpen(false);
    fetchData(); // Segarkan data tabel
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (window.confirm('Hapus lokasi pengiriman ini?')) {
      await supabase.from('customer_addresses').delete().eq('id', addrId);
      fetchData();
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat profil klien...</div>;
  if (!customer) return <div className="p-8 text-center text-red-500">Klien tidak ditemukan.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Tombol Kembali & Profil Klien */}
      <div>
        <Link href="/dashboard/customers" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Kembali ke Daftar Klien
        </Link>
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.company_name}</h1>
            <p className="text-sm font-mono text-gray-500 mt-2 bg-gray-50 inline-block px-3 py-1 rounded border">
              NPWP: {customer.tax_id || 'Belum Terdaftar'}
            </p>
          </div>
          <p className="text-xs text-gray-400">Terdaftar: {new Date(customer.created_at).toLocaleDateString('id-ID')}</p>
        </div>
      </div>

      {/* Manajemen Multi-Alamat */}
      <div className="space-y-4">
        <div className="flex justify-between items-end border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Daftar Lokasi & Alamat</h2>
            <p className="text-xs text-gray-500 mt-1">Kelola alamat penagihan (Billing) dan pengiriman (Shipping)</p>
          </div>
          <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow-sm transition-colors">
            + Tambah Lokasi
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {addresses.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-xl text-gray-400">Belum ada alamat terdaftar.</div>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className={`p-6 rounded-xl border bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${addr.is_default ? 'border-blue-300 shadow-sm ring-2 ring-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${addr.address_type === 'Billing' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                      {addr.address_type}
                    </span>
                    {addr.is_default && (
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        ★ Alamat Utama
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 font-medium leading-relaxed max-w-2xl">{addr.complete_address}</p>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">PIC</span>
                    {addr.pic_name} — {addr.pic_phone || '-'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(addr)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-100 px-4 py-2 rounded transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteAddress(addr.id)} className="text-xs font-bold text-red-500 hover:bg-red-50 border border-red-100 px-4 py-2 rounded transition-colors">
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Alamat */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveAddress} className="bg-white p-8 rounded-2xl max-w-lg w-full space-y-6 shadow-2xl">
            <h3 className="font-bold text-xl text-gray-900 border-b pb-3">
              {modalMode === 'add' ? 'Tambah Lokasi Baru' : 'Ubah Data Alamat'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tipe Alamat</label>
                  <select 
                    className="w-full border p-2.5 rounded-md text-sm font-medium bg-gray-50 focus:ring-blue-500" 
                    value={addressForm.address_type} 
                    onChange={e => setAddressForm({...addressForm, address_type: e.target.value})}
                  >
                    <option value="Shipping">Shipping (Pengiriman)</option>
                    <option value="Billing">Billing (Penagihan)</option>
                  </select>
                </div>
                
                {/* Checkbox Jadikan Utama */}
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={addressForm.is_default}
                      onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})}
                    />
                    <span className="text-sm font-bold text-gray-700">Jadikan Alamat Utama</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Alamat Lengkap</label>
                <textarea 
                  required
                  className="w-full border p-3 rounded-md text-sm focus:ring-blue-500" 
                  rows={3}
                  placeholder="Nama jalan, gedung, kota, kode pos..."
                  value={addressForm.complete_address} 
                  onChange={e => setAddressForm({...addressForm, complete_address: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nama PIC</label>
                  <input 
                    required
                    type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
                    placeholder="Nama penerima..."
                    value={addressForm.pic_name} 
                    onChange={e => setAddressForm({...addressForm, pic_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">No. Telepon PIC</label>
                  <input 
                    type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
                    placeholder="0812-..."
                    value={addressForm.pic_phone} 
                    onChange={e => setAddressForm({...addressForm, pic_phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-gray-500 hover:text-gray-700 px-6 py-2">
                Batal
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-md font-bold text-sm shadow-md transition-colors">
                {modalMode === 'add' ? 'Simpan Alamat' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}