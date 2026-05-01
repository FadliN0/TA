'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AddCustomerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form gabungan (Perusahaan + Alamat Utama)
  const [form, setForm] = useState({
    company_name: '',
    tax_id: '',
    address_type: 'Billing', // Default untuk alamat pertama
    complete_address: '',
    pic_name: '',
    pic_phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Simpan Data Perusahaan ke tabel 'customers'
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{ 
          company_name: form.company_name, 
          tax_id: form.tax_id 
        }])
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Simpan Data Alamat ke tabel 'customer_addresses' 
      // Menggunakan ID dari langkah 1, diset sebagai is_default = true
      const { error: addressError } = await supabase
        .from('customer_addresses')
        .insert([{
          customer_id: customerData.id,
          address_type: form.address_type,
          complete_address: form.complete_address,
          pic_name: form.pic_name,
          pic_phone: form.pic_phone,
          is_default: true
        }]);

      if (addressError) throw addressError;

      router.push('/dashboard/customers'); // Asumsi ada halaman daftar customer
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data Klien B2B.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Registrasi Klien B2B Baru</h1>
        <Link href="/dashboard/customers" className="text-sm text-blue-600 hover:underline">
          Kembali ke Daftar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">{error}</div>}

        {/* --- BAGIAN 1: INFO PERUSAHAAN --- */}
        <div>
          <h2 className="text-lg font-bold text-gray-700 border-b pb-2 mb-4">Informasi Perusahaan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Perusahaan</label>
              <input required type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
                placeholder="Contoh: PT. United Tractors"
                value={form.company_name}
                onChange={e => setForm({...form, company_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">NPWP / Tax ID (Opsional)</label>
              <input type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500 font-mono" 
                placeholder="Contoh: 01.234.567.8-091.000"
                value={form.tax_id}
                onChange={e => setForm({...form, tax_id: e.target.value})} />
            </div>
          </div>
        </div>

        {/* --- BAGIAN 2: ALAMAT UTAMA & PIC --- */}
        <div>
          <h2 className="text-lg font-bold text-gray-700 border-b pb-2 mb-4">Alamat Penagihan Utama (Billing)</h2>
          <div className="space-y-6">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Alamat Lengkap</label>
              <textarea required className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" rows={3}
                placeholder="Alamat kantor pusat atau lokasi penagihan..."
                value={form.complete_address}
                onChange={e => setForm({...form, complete_address: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nama PIC (Penanggung Jawab)</label>
                <input required type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
                  placeholder="Contoh: Bpk. Budi Santoso"
                  value={form.pic_name}
                  onChange={e => setForm({...form, pic_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nomor Telepon PIC</label>
                <input type="text" className="w-full border p-2.5 rounded-md text-sm focus:ring-blue-500" 
                  placeholder="Contoh: 0812-3456-7890"
                  value={form.pic_phone}
                  onChange={e => setForm({...form, pic_phone: e.target.value})} />
              </div>
            </div>

          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-bold disabled:bg-blue-300 transition-colors">
            {isLoading ? 'Mendaftarkan...' : 'Daftarkan Klien'}
          </button>
        </div>
      </form>
    </div>
  );
}