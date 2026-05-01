'use client';

import { useState } from 'react';
import { createStaffAccount } from './actions'; // Memanggil Server Action

export default function UserManagementPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Memanggil fungsi dari server
    const result = await createStaffAccount(email, password);

    if (result.success) {
      alert(`Berhasil! Akun ${email} siap digunakan oleh Bos / Admin baru.`);
      setEmail('');
      setPassword('');
    } else {
      alert(`Gagal membuat akun: ${result.error}`);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Akses Sistem</h1>
        <p className="text-sm text-gray-500">Tambahkan akun baru untuk Direktur (Bos) atau Staf Admin lainnya.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800">Buat Akun Baru</h2>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Email Pengguna Baru</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 outline-none focus:border-blue-500 transition-colors font-medium text-gray-800" 
                placeholder="contoh: bos.hjp@gmail.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Kata Sandi (Password)</label>
              <input 
                type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 outline-none focus:border-blue-500 transition-colors font-medium text-gray-800" 
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Hak Akses (Role)</label>
            <select 
              value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 outline-none focus:border-blue-500 transition-colors font-bold text-gray-800"
            >
              <option value="Admin">Admin Operasional (Bisa Edit Data)</option>
              <option value="Direktur">Direktur / Bos (Hanya Lihat Laporan)</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1">*Catatan: Pengaturan pembatasan layar berdasarkan Role dapat disempurnakan di tahap selanjutnya.</p>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" disabled={loading}
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