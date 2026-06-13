'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { addAddress, updateAddress, deleteAddress } from './actions';

interface Address {
  id: string;
  address_type: string;
  complete_address: string;
  pic_name: string;
  pic_phone: string;
  is_default: boolean;
}

interface Customer {
  id: string;
  company_name: string;
  tax_id: string;
  created_at: string;
}

interface Props {
  initialCustomer: Customer;
  initialAddresses: Address[];
}

const emptyForm = {
  id: '',
  address_type: 'Shipping',
  complete_address: '',
  pic_name: '',
  pic_phone: '',
  is_default: false,
};

export default function CustomerDetailClient({ initialCustomer, initialAddresses }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [addressForm, setAddressForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setError(null);
    setModalMode('add');
    setAddressForm({ ...emptyForm, address_type: 'Shipping' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr: Address) => {
    setError(null);
    setModalMode('edit');
    setAddressForm({
      id: addr.id,
      address_type: addr.address_type,
      complete_address: addr.complete_address,
      pic_name: addr.pic_name,
      pic_phone: addr.pic_phone,
      is_default: addr.is_default,
    });
    setIsModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (modalMode === 'add') {
          await addAddress(initialCustomer.id, addressForm);
        } else {
          await updateAddress(initialCustomer.id, addressForm.id, addressForm);
        }
        setIsModalOpen(false);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleDeleteAddress = (addrId: string) => {
    if (!window.confirm('Hapus lokasi pengiriman ini?')) return;
    startTransition(async () => {
      await deleteAddress(initialCustomer.id, addrId);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Profil Klien */}
      <div>
        <Link href="/dashboard/customers" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Kembali ke Daftar Klien
        </Link>
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{initialCustomer.company_name}</h1>
            <p className="text-sm font-mono text-gray-500 mt-2 bg-gray-50 inline-block px-3 py-1 rounded border">
              NPWP: {initialCustomer.tax_id || 'Belum Terdaftar'}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Terdaftar: {new Date(initialCustomer.created_at).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      {/* Manajemen Multi-Alamat */}
      <div className="space-y-4">
        <div className="flex justify-between items-end border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Daftar Lokasi & Alamat</h2>
            <p className="text-xs text-gray-500 mt-1">Kelola alamat penagihan (Billing) dan pengiriman (Shipping)</p>
          </div>
          <button
            onClick={handleOpenAdd}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            + Tambah Lokasi
          </button>
        </div>

        {isPending && (
          <div className="text-center text-sm text-slate-400 font-medium py-2 animate-pulse">
            Memperbarui data...
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {initialAddresses.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-xl text-gray-400">
              Belum ada alamat terdaftar.
            </div>
          ) : (
            initialAddresses.map(addr => (
              <div
                key={addr.id}
                className={`p-6 rounded-xl border bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${addr.is_default ? 'border-blue-300 shadow-sm ring-2 ring-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
              >
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tipe Alamat</label>
                  <select
                    className="w-full border p-2.5 rounded-md text-sm font-medium bg-gray-50 focus:ring-blue-500"
                    value={addressForm.address_type}
                    onChange={e => setAddressForm({ ...addressForm, address_type: e.target.value })}
                  >
                    <option value="Shipping">Shipping (Pengiriman)</option>
                    <option value="Billing">Billing (Penagihan)</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={addressForm.is_default}
                      onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
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
                  onChange={e => setAddressForm({ ...addressForm, complete_address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nama PIC</label>
                  <input
                    required
                    type="text"
                    className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500"
                    placeholder="Nama penerima..."
                    value={addressForm.pic_name}
                    onChange={e => setAddressForm({ ...addressForm, pic_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">No. Telepon PIC</label>
                  <input
                    type="text"
                    className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500"
                    placeholder="0812-..."
                    value={addressForm.pic_phone}
                    onChange={e => setAddressForm({ ...addressForm, pic_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-gray-500 hover:text-gray-700 px-6 py-2">
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-md font-bold text-sm shadow-md transition-colors disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : modalMode === 'add' ? 'Simpan Alamat' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}