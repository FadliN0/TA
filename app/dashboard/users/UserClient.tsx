'use client';
import { useState } from 'react';
import { useToast } from "@/components/ui/Alert";
import Link from 'next/link';
import { getUsers, updateUserPassword } from './actions';

type UserProfile = {
  id: string;
  username: string | null;   // ← nullable (akun lama belum punya)
  role: string | null;
};

// ── Helper: warna badge per role ──
const roleStyles: Record<string, { bg: string; text: string; border: string; icon: string; avatar: string }> = {
  admin:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '🛡️', avatar: 'from-sky-500 to-blue-700' },
  atasan:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: '👑', avatar: 'from-amber-500 to-orange-700' },
  manager: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: '📋', avatar: 'from-violet-500 to-purple-700' },
};

function getRoleStyle(role: string | null) {
  return roleStyles[(role ?? '').toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '👤', avatar: 'from-gray-400 to-gray-600' };
}

export default function UserClient({ initialUsers }: { initialUsers: UserProfile[] }) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const result = await getUsers();
    if (result.success && result.data) setUsers(result.data);
    setLoadingUsers(false);
  };

  const handleOpenPasswordModal = (user: UserProfile) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdatingPassword(true);
    const result = await updateUserPassword(selectedUser.id, newPassword);
    if (result.success) {
      toast.success(
        `Berhasil! Sandi untuk ${selectedUser.username ?? selectedUser.id.slice(0, 8)} telah diperbarui.`,
        'Sukses'
      );
      setIsModalOpen(false);
    } else {
      toast.error(`Gagal mengubah sandi: ${result.error}`, 'Error');
    }
    setUpdatingPassword(false);
  };

  // ── Filter: cari by username ATAU role ──
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  // ── Stat cards: hitung per role dinamis ──
  const roleCount = {
    admin:   users.filter((u) => u.role?.toLowerCase() === 'admin').length,
    atasan:  users.filter((u) => u.role?.toLowerCase() === 'atasan').length,
    manager: users.filter((u) => u.role?.toLowerCase() === 'manager').length,
  };

  // ── Avatar initial (handle null username) ──
  const getInitial = (u: UserProfile) => (u.username ?? '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-stone-100">
      {/* ── HEADER BAR ── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">
              Manajemen Pengguna
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">
              {loadingUsers ? 'Memuat data...' : `${users.length} pengguna terdaftar`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari username / role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-100/50 border border-gray-200 rounded-full text-gray-700 text-sm placeholder:text-gray-400 pl-10 pr-4 py-2 w-48 sm:w-60 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {/* Refresh */}
            <button
              onClick={fetchUsers}
              title="Segarkan Data"
              className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {/* Tambah Pengguna */}
            <Link href="/dashboard/users/tambah">
              <button className="bg-[#0f3460] hover:bg-[#1a4b8a] text-white text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm shadow-blue-900/20 hover:shadow-md hover:shadow-blue-900/30 hover:-translate-y-0.5 transition-all whitespace-nowrap cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Pengguna
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Pengguna', value: users.length, icon: '👥', bg: 'bg-blue-50', num: 'text-blue-800', text: 'text-blue-900' },
            { label: 'Administrator', value: roleCount.admin, icon: '🛡️', bg: 'bg-sky-50', num: 'text-sky-800', text: 'text-sky-900' },
            { label: 'Atasan', value: roleCount.atasan, icon: '👑', bg: 'bg-amber-50', num: 'text-amber-800', text: 'text-amber-900' },
            { label: 'Manager', value: roleCount.manager, icon: '📋', bg: 'bg-violet-50', num: 'text-violet-800', text: 'text-violet-900' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-black/5 rounded-lg p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${stat.num} leading-tight`}>
                  {loadingUsers ? '—' : stat.value}
                </div>
                <div className={`text-[11px] font-medium ${stat.text} opacity-60 mt-0.5 tracking-wide`}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              Daftar Pengguna
              {searchQuery && (
                <span className="text-gray-400 font-normal ml-2">
                  — {filteredUsers.length} hasil untuk &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-700 font-semibold hover:text-blue-900 transition-colors cursor-pointer"
              >
                ✕ Hapus Filter
              </button>
            )}
          </div>

          {loadingUsers ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-[#0f3460] rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Memuat data pengguna...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-stone-100 bg-stone-50">
                    <th className="px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest w-2/5">
                      Username
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest w-1/5">
                      Hak Akses
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      ID Pengguna
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right w-44">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center">
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-sm text-gray-400">
                          {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Tidak ada data pengguna.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => {
                      const style = getRoleStyle(u.role);
                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-stone-50 transition-colors group ${idx < filteredUsers.length - 1 ? 'border-b border-stone-100' : ''}`}
                        >
                          {/* Username + Avatar */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm bg-gradient-to-br ${style.avatar}`}>
                                {getInitial(u)}
                              </div>
                              <span className="text-sm font-semibold text-gray-800">
                                {u.username ?? (
                                  <span className="text-gray-400 italic font-normal">belum diset</span>
                                )}
                              </span>
                            </div>
                          </td>
                          {/* Role Badge */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide border ${style.bg} ${style.text} ${style.border}`}>
                              {style.icon} {(u.role ?? '—').toUpperCase()}
                            </span>
                          </td>
                          {/* ID */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[11px] text-gray-400 bg-stone-100 px-2 py-0.5 rounded">
                              {u.id.substring(0, 12)}…
                            </span>
                          </td>
                          {/* Action */}
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleOpenPasswordModal(u)}
                              className="bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              🔑 Ubah Sandi
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* Table Footer */}
          {!loadingUsers && filteredUsers.length > 0 && (
            <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Menampilkan {filteredUsers.length} dari {users.length} pengguna
              </span>
              <span className="text-xs text-gray-300">Data diperbarui secara manual</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL UBAH SANDI ── */}
      {isModalOpen && selectedUser && (
        <div
          className="fixed inset-0 bg-[#0f3460]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-[#0f3460] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white leading-none">Ubah Kata Sandi</h3>
                <p className="text-[11px] text-white/50 mt-1">Pengaturan Keamanan Akun</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white/60 hover:text-white text-sm transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdatePassword}>
              <div className="p-6 space-y-5">
                {/* User info */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm bg-gradient-to-br ${getRoleStyle(selectedUser.role).avatar}`}>
                    {getInitial(selectedUser)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {selectedUser.username ?? (
                        <span className="text-gray-400 italic font-normal">belum diset</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {(selectedUser.role ?? '—').toUpperCase()} ·{' '}
                      {selectedUser.id.substring(0, 8)}…
                    </div>
                  </div>
                </div>
                {/* Password field */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter..."
                      className="w-full border border-gray-300 focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460]/20 rounded-md px-3 py-2.5 pr-10 text-sm text-gray-800 outline-none placeholder:text-gray-300 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm cursor-pointer transition-colors"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-[11px] text-red-500 mt-1.5">⚠ Kata sandi minimal 6 karakter</p>
                  )}
                  {newPassword && newPassword.length >= 6 && (
                    <p className="text-[11px] text-emerald-600 mt-1.5">✓ Kata sandi valid</p>
                  )}
                </div>
              </div>
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-md transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword || newPassword.length < 6}
                  className="bg-[#0f3460] hover:bg-[#1e4a80] disabled:bg-slate-400 text-white text-sm font-bold px-5 py-2 rounded-md flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {updatingPassword ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : '🔐 Simpan Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}