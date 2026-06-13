'use client';

import { useState } from 'react';
import { createStaffAccount } from './actions';
import { useToast } from '@/components/ui/Alert';

export default function AddUserClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  // Ubah default ke 'admin' huruf kecil
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Memanggil fungsi dari server, PASTIKAN MENGIRIM ROLE JUGA
    const result = await createStaffAccount(email, password, role);

    if (result.success) {
      toast.success(
        `Berhasil! Akun ${email} siap digunakan dengan hak akses ${role.toUpperCase()}.`,
        'Sukses'
      );
      setEmail('');
      setPassword('');
    } else {
      toast.error(`Gagal membuat akun: ${result.error}`, 'Error');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Manajemen Akses Sistem
        </h1>
        <p className="text-sm text-gray-500">
          Tambahkan akun baru untuk Direktur (Bos) atau Staf Admin lainnya.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800">Buat Akun Baru</h2>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Email Pengguna Baru
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 outline-none focus:border-blue-500 transition-colors font-medium text-gray-800"
                placeholder="contoh: bos.hjp@gmail.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Kata Sandi (Password)
              </label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 outline-none focus:border-blue-500 transition-colors font-medium text-gray-800"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Hak Akses (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 outline-none focus:border-blue-500 transition-colors font-bold text-gray-800"
            >
              {/* UBAH VALUE MENJADI admin DAN atasan */}
              <option value="admin">
                Admin Operasional (Bisa Input/Edit Data)
              </option>
              <option value="atasan">
                Direktur / Atasan (Hanya Pantau Laporan & Tracking)
              </option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:bg-blue-300 disabled:shadow-none"
            >
              {loading ? 'Memproses Akun...' : '+ Daftarkan Akun Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}