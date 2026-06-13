'use client';

import { useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import { addCustomer, updateCustomer, deleteCustomer } from './actions';
import { useToast } from '@/components/ui/Alert';

interface Address {
  id: string;
  address_type: string;
  pic_name: string;
  pic_phone: string;
  complete_address: string;
  is_default: boolean;
}

interface Customer {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  customer_addresses: Address[];
}

interface Props {
  initialCustomers: Customer[];
}

const emptyForm = {
  id: '',
  company_name: '',
  email: '',
  phone: '',
  addresses: [
    { id: '', address_type: 'Billing', pic_name: '', pic_phone: '', complete_address: '', is_default: true },
  ],
};

export default function CustomersClient({ initialCustomers }: Props) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const filteredCustomers = initialCustomers.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_addresses?.some(addr => addr.pic_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const openModal = (mode: 'add' | 'edit', customer: Customer | null = null) => {
    setError(null);
    setModalMode(mode);
    if (mode === 'edit' && customer) {
      setFormData({
        id: customer.id,
        company_name: customer.company_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        addresses: customer.customer_addresses?.length > 0
          ? customer.customer_addresses
          : [{ id: '', address_type: 'Billing', pic_name: '', pic_phone: '', complete_address: '', is_default: true }],
      });
    } else {
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const addAddressField = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, { id: '', address_type: 'Shipping', pic_name: '', pic_phone: '', complete_address: '', is_default: false }],
    });
  };

  const removeAddressField = (i: number) => {
    setFormData({ ...formData, addresses: formData.addresses.filter((_, idx) => idx !== i) });
  };

  const updateAddressField = (index: number, field: string, value: any) => {
    const updated = [...formData.addresses];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, addresses: updated });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (modalMode === 'add') {
          await addCustomer(formData);
        } else {
          await updateCustomer(formData);
        }
        toast.success('Pelanggan berhasil disimpan!', 'Sukses');
        setIsModalOpen(false);
      } catch (err: any) {
        setError(err.message);
        toast.error(`Gagal menyimpan pelanggan: ${err.message}`, 'Error');
      }
    });
  };

  const handleDelete = (id: string, company_name: string) => {
    if (!window.confirm(`Yakin ingin menghapus "${company_name}" beserta semua alamatnya?\n(Akan ditolak jika klien sudah punya transaksi)`)) return;
    startTransition(async () => {
      try {
        await deleteCustomer(id);
        toast.success('Pelanggan berhasil dihapus!', 'Sukses');
      } catch {
        toast.error('Gagal menghapus. Pelanggan ini sedang digunakan di dokumen transaksi.', 'Error');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">

      {/* KONTROL ATAS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Master Pelanggan</h1>
          <p className="text-sm text-slate-500">Kelola daftar klien (B2B) dan multi-alamat pengiriman.</p>
        </div>
        <button onClick={() => openModal('add')} className="btn-primary w-full md:w-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pelanggan
        </button>
      </div>

      {/* PENCARIAN */}
      <div className="card-modern p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari Nama Perusahaan atau Nama PIC..."
            className="input-modern pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* DATA PELANGGAN */}
      {isPending ? (
        <div className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold animate-pulse">Memperbarui data...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card-modern p-16 text-center flex flex-col items-center justify-center border-dashed border-2">
          <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-bold text-slate-700">Tidak ada pelanggan</h3>
          <p className="text-sm text-slate-500 mt-1">Data yang kamu cari tidak ditemukan atau belum ada klien yang terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase leading-tight mb-1">{c.company_name}</h3>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {c.email || 'Tanpa Email'}
                    </span>
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {c.phone || 'Tanpa Telepon'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal('edit', c)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors" title="Edit Pelanggan">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(c.id, c.company_name)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors" title="Hapus Pelanggan">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-3 bg-white">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Daftar Alamat & PIC</h4>
                <div className="space-y-3 overflow-y-auto custom-scrollbar max-h-[220px] pr-2">
                  {c.customer_addresses?.map((addr, idx) => (
                    <div key={addr.id || idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className={addr.address_type?.toLowerCase() === 'billing' ? 'badge-success' : 'badge-warning'}>
                          {addr.address_type}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">{addr.pic_name}</span>
                          <span className="text-slate-500 font-mono text-[10px] block">{addr.pic_phone}</span>
                        </div>
                      </div>
                      <div className="text-slate-600 leading-relaxed font-medium">{addr.complete_address}</div>
                    </div>
                  ))}
                  {(!c.customer_addresses || c.customer_addresses.length === 0) && (
                    <div className="text-xs text-slate-400 italic text-center py-4">Belum ada alamat terdaftar</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Tambah Pelanggan Baru' : 'Edit Data Pelanggan'}
        footer={
          <>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Batal</button>
            <button type="submit" form="customerForm" disabled={isPending} className="btn-primary">
              {isPending ? 'Menyimpan...' : 'Simpan Pelanggan'}
            </button>
          </>
        }
      >
        <form id="customerForm" onSubmit={handleSave} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          {/* Identitas PT */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2">1. Identitas Perusahaan Utama</h3>
            <div>
              <label className="label-modern">Nama Perusahaan (B2B)</label>
              <input type="text" required value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="input-modern uppercase font-bold" placeholder="PT. ANCARA COAL TERMINAL" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-modern">Email Kantor</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-modern" placeholder="info@perusahaan.com" />
              </div>
              <div>
                <label className="label-modern">Telp Kantor</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-modern" placeholder="(021) 1234567" />
              </div>
            </div>
          </div>

          {/* Array Alamat */}
          <div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4">
              <h3 className="text-sm font-black text-slate-800">2. Daftar Alamat & PIC Klien</h3>
              <button type="button" onClick={addAddressField} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                + Tambah Alamat Lain
              </button>
            </div>
            <div className="space-y-4">
              {formData.addresses.map((addr, index) => (
                <div key={index} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative">
                  {index > 0 && (
                    <button type="button" onClick={() => removeAddressField(index)} className="absolute -top-3 -right-3 bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white p-1.5 rounded-full transition-colors shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="label-modern">Tipe Alamat</label>
                      <select value={addr.address_type} onChange={e => updateAddressField(index, 'address_type', e.target.value)} className="input-modern">
                        <option value="Billing">Billing (Kantor Pusat)</option>
                        <option value="Shipping">Shipping (Site/Gudang)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-modern">Nama PIC</label>
                      <input type="text" required value={addr.pic_name} onChange={e => updateAddressField(index, 'pic_name', e.target.value)} className="input-modern" placeholder="Nama PIC" />
                    </div>
                    <div>
                      <label className="label-modern">No HP PIC</label>
                      <input type="text" required value={addr.pic_phone} onChange={e => updateAddressField(index, 'pic_phone', e.target.value)} className="input-modern" placeholder="0812..." />
                    </div>
                  </div>
                  <div>
                    <label className="label-modern">Alamat Lengkap Site / Kantor</label>
                    <textarea required rows={2} value={addr.complete_address} onChange={e => updateAddressField(index, 'complete_address', e.target.value)} className="input-modern resize-none" placeholder="Jln. Raya Proyek Site A..." />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}