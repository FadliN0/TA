"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useToast } from "@/components/ui/Alert";
import { updateProductFieldAction } from "../actions";
import { createQuotationAction } from "./actions";

type CreateQuotationClientProps = {
  products: any[];
  customers: any[];
  initialQuotationNumber: string;
  initialValidUntil: string;
};

export default function CreateQuotationClient({
  products,
  customers,
  initialQuotationNumber,
  initialValidUntil,
}: CreateQuotationClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productsList, setProductsList] = useState<any[]>(products);
  const customersList = customers;
  const [addressesList, setAddressesList] = useState<any[]>([]);

  const [quotationNumber] = useState(initialQuotationNumber);
  const [validUntil, setValidUntil] = useState(initialValidUntil);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [mrNumber, setMrNumber] = useState("");
  const [notes, setNotes] = useState("Ready Stock\nFranco Site");

  const [items, setItems] = useState([
    {
      product_id: "",
      part_code: "",
      part_name: "",
      unit: "",
      qty: 1,
      unit_price: 0,
      discount: 0,
      remark: "",
      _db_price: 0,
      _db_remark: "",
    },
  ]);

  const toast = useToast();

  // Update master produk (harga / remark) saat user benar-benar mengubahnya
  const updateProductField = async (
    productId: string,
    field: "price" | "remark",
    value: number | string,
  ) => {
    if (!productId) return;
    const res = await updateProductFieldAction(productId, field, value);
    if (!res.success) {
      toast.error(
        `Gagal memperbarui ${field === "price" ? "harga" : "keterangan"} produk`,
      );
    } else {
      toast.success(
        `${field === "price" ? "Harga" : "Keterangan"} produk diperbarui di master data`,
        "Sinkronisasi Produk",
      );
      setProductsList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)),
      );
    }
  };

  const handleCustomerChange = async (id: string) => {
    setSelectedCustomerId(id);
    setSelectedAddressId("");
    const { data: addrs } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", id);
    if (addrs) {
      setAddressesList(addrs);
      const def = addrs.find((a) => a.is_default);
      if (def) setSelectedAddressId(def.id);
      else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
    }
  };

  const handleProductSelect = (index: number, pid: string) => {
    const prod = productsList.find((p) => p.id === pid);
    if (prod) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        product_id: prod.id,
        part_code: prod.part_code,
        part_name: prod.part_name,
        unit: prod.unit,
        unit_price: prod.price,
        remark: prod.remark,
        _db_price: prod.price,
        _db_remark: prod.remark,
      };
      setItems(newItems);
    }
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const grandTotal = items.reduce((sum, i) => {
    const lineTotal = i.qty * i.unit_price;
    const discountAmount = lineTotal * ((i.discount || 0) / 100);
    return sum + (lineTotal - discountAmount);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (items.some((i) => !i.product_id)) {
      setError(
        "Peringatan: Ada baris barang yang belum dipilih produknya. Silakan lengkapi atau hapus baris tersebut.",
      );
      setIsLoading(false);
      return;
    }

    try {
      const itemsPayload = items.map((i) => {
        const lineTotal = i.qty * i.unit_price;
        const discountAmount = lineTotal * ((i.discount || 0) / 100);
        return {
          product_id: i.product_id,
          qty: i.qty,
          unit_price: i.unit_price,
          discount: i.discount,
          total_price: lineTotal - discountAmount,
        };
      });

      const res = await createQuotationAction({
        quotationNumber,
        customerId: selectedCustomerId,
        addressId: selectedAddressId,
        validUntil,
        mrNumber: mrNumber || null,
        grandTotal,
        notes: notes || null,
        items: itemsPayload,
      });

      if (!res.success) throw new Error(res.error);

      toast.success("Quotation berhasil dibuat!");
      router.push("/dashboard/quotations");
    } catch (err: any) {
      console.error("Error Transaction:", err);
      setError(
        err.message || "Terjadi kesalahan sistem saat menyimpan dokumen.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10 animate-in fade-in duration-500">
      {/* HEADER ELEGAN */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Buat Penawaran Baru
          </h1>
          <p className="text-sm text-slate-500">
            Form pembuatan dokumen Quotation (QO).
          </p>
        </div>
        <Link href="/dashboard/quotations" className="btn-secondary">
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
          Kembali
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BANNER ERROR */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-700 shadow-sm">
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* SECTION 1: INFO DOKUMEN & KLIEN */}
        <div className="card-modern p-6 md:p-8">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-6">
            1. Informasi Dokumen & Klien
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kiri: Nomor Dokumen */}
            <div className="space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
              <div>
                <label className="label-modern">Nomor Penawaran (Auto)</label>
                <input
                  type="text"
                  readOnly
                  value={quotationNumber}
                  className="input-modern font-mono font-bold text-blue-700 bg-slate-100 border-slate-200 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-modern">Berlaku Sampai (Valid)</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="label-modern text-blue-600">
                    Nomor MR / Referensi
                  </label>
                  <input
                    type="text"
                    value={mrNumber}
                    onChange={(e) => setMrNumber(e.target.value)}
                    placeholder="Opsional (Ex: MR-030093)"
                    className="input-modern border-blue-200 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Kanan: Klien & Alamat */}
            <div className="space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
              <div>
                <label className="label-modern">Pilih Pelanggan (B2B)</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="input-modern font-bold"
                >
                  <option value="">-- Pilih Perusahaan --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-modern">Alamat Pengiriman / Site</label>
                <select
                  required
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  disabled={!selectedCustomerId}
                  className="input-modern disabled:opacity-50"
                >
                  <option value="">-- Pilih Alamat Tersedia --</option>
                  {addressesList.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.address_type}] {a.pic_name} - {a.complete_address}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: RINCIAN BARANG */}
        <div className="card-modern p-6 md:p-8">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              2. Rincian Suku Cadang (Items)
            </h2>
          </div>

          <div className="space-y-4">
            {/* Header Tabel Virtual (Hanya Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <div className="col-span-2">Pilih Part Code</div>
              <div className="col-span-2">Deskripsi</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-right">Harga Satuan (Rp)</div>
              <div className="col-span-1 text-center">Disc %</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-2">Keterangan</div>
              <div className="col-span-1 text-center">Aksi</div>
            </div>

            {/* List Barang */}
            {items.map((item, idx) => {
              const lineTotal = item.qty * item.unit_price;
              const afterDisc =
                lineTotal - lineTotal * ((item.discount || 0) / 100);

              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center bg-white md:bg-slate-50/50 p-4 rounded-xl border border-slate-200 relative group transition-colors hover:border-blue-200"
                >
                  {/* Part Code */}
                  <div className="md:col-span-2">
                    <label className="md:hidden label-modern">Part Code</label>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="input-modern py-2 font-mono text-xs"
                    >
                      <option value="">-- Pilih Barang --</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.part_code}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deskripsi Barang */}
                  <div className="md:col-span-2">
                    <label className="md:hidden label-modern">Nama Part</label>
                    <input
                      type="text"
                      readOnly
                      value={item.part_name}
                      placeholder="Otomatis terisi..."
                      className="input-modern py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Qty & Price (Mobile Grid) */}
                  <div className="grid grid-cols-2 gap-3 md:col-span-3 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <label className="md:hidden label-modern text-center">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) =>
                          updateItemField(
                            idx,
                            "qty",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="input-modern py-2 text-center text-xs font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="md:hidden label-modern">
                        Harga Satuan (Rp)
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItemField(
                            idx,
                            "unit_price",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          // Update ke DB hanya jika nilainya berubah dari aslinya
                          if (item.product_id && val !== item._db_price) {
                            updateProductField(item.product_id, "price", val);
                            updateItemField(idx, "_db_price", val); // update tracking
                          }
                        }}
                        className="input-modern py-2 text-right text-xs"
                      />
                    </div>
                  </div>

                  {/* Discount & Total */}
                  <div className="grid grid-cols-2 gap-3 md:col-span-2 items-center">
                    <div>
                      <label className="md:hidden label-modern">Diskon %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) =>
                          updateItemField(
                            idx,
                            "discount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="input-modern py-2 text-center text-xs font-bold text-rose-600 bg-rose-50 focus:bg-white border-rose-100 focus:border-rose-300"
                      />
                    </div>
                    <div className="text-right">
                      <label className="md:hidden label-modern text-right">
                        Subtotal
                      </label>
                      <span
                        className="font-black text-slate-800 text-sm truncate block"
                        title={`Rp ${afterDisc.toLocaleString("id-ID")}`}
                      >
                        {afterDisc.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Remark / Keterangan */}
                  <div className="md:col-span-2">
                    <label className="md:hidden label-modern">Keterangan</label>
                    <input
                      type="text"
                      placeholder="Keterangan..."
                      value={item.remark || ""}
                      onChange={(e) =>
                        updateItemField(idx, "remark", e.target.value)
                      }
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (item.product_id && val !== item._db_remark) {
                          updateProductField(item.product_id, "remark", val);
                          updateItemField(idx, "_db_remark", val);
                        }
                      }}
                      className="input-modern py-2 text-xs"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 text-right md:text-center mt-2 md:mt-0">
                    <button
                      type="button"
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== idx))
                      }
                      disabled={items.length === 1}
                      className="w-full md:w-auto p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="md:hidden">Hapus Baris Ini</span>
                      <svg
                        className="hidden md:inline-block w-4 h-4"
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
                </div>
              );
            })}

            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      product_id: "",
                      part_code: "",
                      part_name: "",
                      unit: "",
                      qty: 1,
                      unit_price: 0,
                      discount: 0,
                      remark: "",
                      _db_price: 0,
                      _db_remark: "",
                    },
                  ])
                }
                className="w-full md:w-auto border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-bold px-6 py-3 rounded-xl transition-colors flex justify-center items-center gap-2 text-sm"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Tambah Baris Barang Baru
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: FOOTER (Catatan & Grand Total) */}
        <div className="card-modern p-6 md:p-8 flex flex-col md:flex-row gap-8 bg-slate-900 text-white">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Catatan Penawaran (Notes)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 resize-none"
              placeholder="Tuliskan Term of Payment, waktu pengiriman, dll..."
            />
          </div>

          <div className="flex-[0.7] flex flex-col justify-end items-start md:items-end gap-4 border-t md:border-t-0 md:border-l border-slate-700 pt-6 md:pt-0 md:pl-8">
            <div className="w-full text-left md:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Grand Total
              </p>
              <p className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tight">
                <span className="text-emerald-600 mr-1">Rp</span>
                {grandTotal.toLocaleString("id-ID")}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-900/50 disabled:bg-slate-700 disabled:text-slate-400 transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Menyimpan Dokumen...
                </>
              ) : (
                <>
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
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Simpan & Terbitkan Quotation
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
