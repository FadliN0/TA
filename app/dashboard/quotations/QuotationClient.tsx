'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteQuotationAction } from './actions';

type QuotationClientProps = { initialQuotations: any[] };

export default function QuotationClient({
  initialQuotations,
}: QuotationClientProps) {
  const router = useRouter();
  const quotations = initialQuotations;
  const loading = false;
  const [search, setSearch] = useState('');

  const handleDelete = async (id: string, qNumber: string) => {
    const isConfirm = window.confirm(
      `Yakin ingin menghapus dokumen penawaran ${qNumber}?\nTindakan ini tidak bisa dibatalkan.`,
    );
    if (!isConfirm) return;

    const res = await deleteQuotationAction(id);
    if (!res.success) {
      alert(`Gagal menghapus: ${res.error}`);
      return;
    }
    router.refresh();
  };

  const filteredQuotations = quotations.filter(
    (q) =>
      q.quotation_number?.toLowerCase().includes(search.toLowerCase()) ||
      (q.customers?.company_name &&
        q.customers.company_name.toLowerCase().includes(search.toLowerCase())),
  );

  // Komponen Helper untuk Badge Status
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'Draft':
        return <span className="badge-neutral">Draft</span>;
      case 'Sent':
        return (
          <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block">
            Dikirim
          </span>
        );
      case 'Approved':
        return <span className="badge-success">Disetujui</span>;
      case 'Rejected':
        return <span className="badge-danger">Ditolak</span>;
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  };

  const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* HEADER ELEGAN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Dokumen Quotation
          </h1>
          <p className="text-sm text-slate-500">
            Kelola dan cetak surat penawaran harga alat berat.
          </p>
        </div>
        <Link
          href="/dashboard/quotations/create"
          className="btn-primary w-full md:w-auto"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Buat Penawaran Baru
        </Link>
      </div>

      {/* PENCARIAN */}
      <div className="card-modern p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari Nomor Dokumen atau Nama Pelanggan..."
            className="input-modern pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg
            className="w-5 h-5 absolute left-3 top-3.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">
            Memuat data dokumen...
          </p>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="card-modern p-16 text-center flex flex-col items-center justify-center border-dashed border-2">
          <svg
            className="w-16 h-16 text-slate-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-bold text-slate-700">
            Tidak ada dokumen
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Belum ada Quotation yang dibuat atau ditemukan.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP (TABEL) */}
          <div className="hidden md:block card-modern overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                    No. Dokumen
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                    Tanggal Dibuat
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                    Klien (B2B)
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">
                    Grand Total
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">
                    Status
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-mono text-sm font-bold text-blue-700">
                        {q.quotation_number}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-800">
                        {new Date(q.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        Valid:{' '}
                        {new Date(q.valid_until).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-800 uppercase">
                        {q.customers?.company_name || (
                          <span className="text-rose-400 italic">
                            Klien Terhapus
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-900 text-right font-black">
                      {fmtRp(q.grand_total || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/dashboard/quotations/${q.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          Buka
                        </Link>
                        <button
                          onClick={() => handleDelete(q.id, q.quotation_number)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          title="Hapus Dokumen"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE (KARTU) */}
          <div className="md:hidden space-y-4">
            {filteredQuotations.map((q) => (
              <div
                key={q.id}
                className="card-modern p-5 flex flex-col gap-3 relative"
              >
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <div className="font-mono text-sm font-bold text-blue-700">
                      {q.quotation_number}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(q.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <StatusBadge status={q.status} />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase mb-1">
                    {q.customers?.company_name || (
                      <span className="text-rose-400 italic">
                        Klien Terhapus
                      </span>
                    )}
                  </h3>
                  <div className="text-lg font-black text-slate-900">
                    {fmtRp(q.grand_total || 0)}
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-100 mt-1">
                  <button
                    onClick={() => handleDelete(q.id, q.quotation_number)}
                    className="text-xs font-bold text-rose-500 px-2 py-2"
                  >
                    Hapus
                  </button>
                  <Link
                    href={`/dashboard/quotations/${q.id}`}
                    className="flex-1 text-center text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg"
                  >
                    Buka Detail & PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}