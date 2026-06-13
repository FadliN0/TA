"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertBanner } from "@/components/ui/Alert";
import { bulkCreateProductsAction } from "./actions";

interface ProductForm {
  tempId: number;
  part_code: string;
  part_name: string;
  unit: string;
  price: number;
  remark: string;
}

type AddProductClientProps = { existingCodes: string[] };

export default function AddProductClient({
  existingCodes,
}: AddProductClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set semua part_code yang sudah ada di DB (dari server)
  const existingSet = new Set(existingCodes);
  // Set tempId yang part_code-nya duplikat
  const [duplicateIds, setDuplicateIds] = useState<Set<number>>(new Set());

  const [forms, setForms] = useState<ProductForm[]>([
    {
      tempId: Date.now(),
      part_code: "",
      part_name: "",
      unit: "PCS",
      price: 0,
      remark: "",
    },
  ]);

  const handleAddRow = () => {
    setForms([
      ...forms,
      {
        tempId: Date.now(),
        part_code: "",
        part_name: "",
        unit: "PCS",
        price: 0,
        remark: "",
      },
    ]);
  };

  const handleRemoveRow = (id: number) => {
    if (forms.length === 1) return;
    setForms(forms.filter((f) => f.tempId !== id));
    setDuplicateIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const handleChange = (
    id: number,
    field: keyof ProductForm,
    value: string | number,
  ) => {
    setForms(
      forms.map((f) => (f.tempId === id ? { ...f, [field]: value } : f)),
    );

    // Cek duplikat real-time saat user mengetik part_code
    if (field === "part_code" && typeof value === "string") {
      const upper = value.toUpperCase().trim();
      if (upper && existingSet.has(upper)) {
        setDuplicateIds((prev) => new Set([...prev, id]));
      } else {
        setDuplicateIds((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }
    }
  };

  const hasDuplicates = duplicateIds.size > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasDuplicates) {
      setError(
        "Masih ada Part Code yang duplikat. Perbaiki sebelum menyimpan.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    const validForms = forms.filter(
      (f) => f.part_code.trim() !== "" && f.part_name.trim() !== "",
    );
    if (validForms.length === 0) {
      setError("Isi minimal 1 produk (Part Code dan Nama Part wajib diisi).");
      setIsLoading(false);
      return;
    }

    const payload = validForms.map(({ tempId, ...rest }) => rest);

    try {
      const res = await bulkCreateProductsAction(payload);
      if (!res.success) throw new Error(res.error);

      alert(`Berhasil menyimpan ${validForms.length} produk baru!`);
      router.push("/dashboard/products");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data produk.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Input Produk Massal
          </h1>
          <p className="text-sm text-slate-500">
            Masukkan beberapa data produk sekaligus ke dalam katalog.
          </p>
        </div>
        <Link href="/dashboard/products" className="btn-secondary">
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="hidden md:inline">Kembali</span>
        </Link>
      </div>

      {error && (
        <AlertBanner
          variant="error"
          title="Gagal Menyimpan"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {hasDuplicates && (
        <AlertBanner
          variant="warning"
          title="Part Code Duplikat Terdeteksi"
          message="Beberapa Part Code sudah terdaftar di database. Baris yang ditandai wajib diperbaiki sebelum bisa disimpan."
        />
      )}

      <form id="bulkForm" onSubmit={handleSubmit} className="space-y-4">
        {/* ─── DESKTOP ─────────────────────────────────────────────────────── */}
        <div className="hidden md:block card-modern overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase w-48">
                  Part Code *
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                  Nama Part *
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase w-28 text-center">
                  Satuan
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase w-48 text-right">
                  Harga Jual (Rp)
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase w-56">
                  Keterangan
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase w-16 text-center">
                  Hapus
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forms.map((form) => {
                const isDuplicate = duplicateIds.has(form.tempId);
                return (
                  <tr
                    key={form.tempId}
                    className="transition-colors"
                    style={{ background: isDuplicate ? "#fffbeb" : undefined }}
                  >
                    {/* Part Code */}
                    <td className="p-3">
                      <div className="relative">
                        <input
                          required
                          type="text"
                          className="input-modern font-mono py-2"
                          placeholder="Ex: 1184"
                          value={form.part_code}
                          onChange={(e) =>
                            handleChange(
                              form.tempId,
                              "part_code",
                              e.target.value.toUpperCase(),
                            )
                          }
                          style={
                            isDuplicate
                              ? {
                                  borderColor: "#f59e0b",
                                  background: "#fef3c7",
                                }
                              : {}
                          }
                        />
                        {isDuplicate && (
                          <p className="text-[10px] text-amber-600 font-bold mt-1">
                            ⚠ Part Code ini sudah ada di database
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <input
                        required
                        type="text"
                        className="input-modern py-2"
                        placeholder="Ex: Expansion Valve"
                        value={form.part_name}
                        onChange={(e) =>
                          handleChange(form.tempId, "part_name", e.target.value)
                        }
                      />
                    </td>

                    <td className="p-3">
                      <select
                        required
                        className="input-modern py-2 text-center"
                        value={form.unit}
                        onChange={(e) =>
                          handleChange(form.tempId, "unit", e.target.value)
                        }
                      >
                        <option value="PCS">PCS</option>
                        <option value="SET">SET</option>
                        <option value="ASSY">ASSY</option>
                        <option value="Ltr">Ltr</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <input
                        required
                        type="number"
                        min="0"
                        className="input-modern py-2 text-right font-bold"
                        value={form.price}
                        onChange={(e) =>
                          handleChange(
                            form.tempId,
                            "price",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="text"
                        className="input-modern py-2"
                        placeholder="Opsional..."
                        value={form.remark}
                        onChange={(e) =>
                          handleChange(form.tempId, "remark", e.target.value)
                        }
                      />
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(form.tempId)}
                        disabled={forms.length === 1}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition disabled:opacity-30"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── MOBILE ───────────────────────────────────────────────────────── */}
        <div className="md:hidden space-y-4">
          {forms.map((form, index) => {
            const isDuplicate = duplicateIds.has(form.tempId);
            return (
              <div
                key={form.tempId}
                className="card-modern p-5 space-y-4 relative"
                style={
                  isDuplicate
                    ? { borderColor: "#f59e0b", background: "#fffbeb" }
                    : {}
                }
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="badge-neutral bg-slate-100 text-slate-500 border-none">
                    Produk #{index + 1}
                  </span>
                  {forms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(form.tempId)}
                      className="text-xs font-bold text-rose-500"
                    >
                      Hapus Kartu
                    </button>
                  )}
                </div>

                <div>
                  <label className="label-modern">Part Code *</label>
                  <input
                    required
                    type="text"
                    className="input-modern font-mono"
                    placeholder="Ex: 1184"
                    value={form.part_code}
                    onChange={(e) =>
                      handleChange(
                        form.tempId,
                        "part_code",
                        e.target.value.toUpperCase(),
                      )
                    }
                    style={
                      isDuplicate
                        ? { borderColor: "#f59e0b", background: "#fef3c7" }
                        : {}
                    }
                  />
                  {isDuplicate && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⚠ Part Code ini sudah ada di database
                    </p>
                  )}
                </div>

                <div>
                  <label className="label-modern">Nama Part *</label>
                  <input
                    required
                    type="text"
                    className="input-modern"
                    placeholder="Ex: Expansion Valve"
                    value={form.part_name}
                    onChange={(e) =>
                      handleChange(form.tempId, "part_name", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-modern">Satuan</label>
                    <select
                      required
                      className="input-modern"
                      value={form.unit}
                      onChange={(e) =>
                        handleChange(form.tempId, "unit", e.target.value)
                      }
                    >
                      <option value="PCS">PCS</option>
                      <option value="SET">SET</option>
                      <option value="ASSY">ASSY</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-modern">Harga (Rp)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      className="input-modern"
                      value={form.price}
                      onChange={(e) =>
                        handleChange(
                          form.tempId,
                          "price",
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="label-modern">Keterangan (Opsional)</label>
                  <input
                    type="text"
                    className="input-modern"
                    placeholder="Keterangan part..."
                    value={form.remark}
                    onChange={(e) =>
                      handleChange(form.tempId, "remark", e.target.value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="btn-secondary w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            + Tambah Baris Kosong
          </button>
          <button
            type="submit"
            disabled={isLoading || hasDuplicates}
            className="btn-primary w-full md:w-auto"
            title={hasDuplicates ? "Perbaiki duplikat terlebih dahulu" : ""}
          >
            {isLoading
              ? "Menyimpan ke Database..."
              : `Simpan ${forms.filter((f) => f.part_code !== "").length} Produk`}
          </button>
        </div>
      </form>
    </div>
  );
}
