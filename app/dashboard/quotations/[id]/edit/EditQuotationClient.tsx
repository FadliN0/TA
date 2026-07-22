"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useToast } from "@/components/ui/Alert";
import { updateProductFieldAction } from "../../actions";
import { updateQuotationAction } from "./actions";

type EditQuotationClientProps = {
  id: string;
  products: any[];
  customers: any[];
  initialAddresses: any[];
  initialQuotationNumber: string;
  initialValidUntil: string;
  initialCustomerId: string;
  initialAddressId: string;
  initialMrNumber: string;
  initialNotes: string;
  initialItems: any[];
  initialGrandTotal: number;
};

export default function EditQuotationClient({
  id,
  products,
  customers,
  initialAddresses,
  initialQuotationNumber,
  initialValidUntil,
  initialCustomerId,
  initialAddressId,
  initialMrNumber,
  initialNotes,
  initialItems,
  initialGrandTotal,
}: EditQuotationClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productsList, setProductsList] = useState<any[]>(products);
  const customersList = customers;
  const [addressesList, setAddressesList] = useState<any[]>(initialAddresses);

  const [quotationNumber] = useState(initialQuotationNumber);
  const [validUntil, setValidUntil] = useState(initialValidUntil);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState(initialCustomerId);
  const [selectedAddressId, setSelectedAddressId] = useState(initialAddressId);
  const [mrNumber, setMrNumber] = useState(initialMrNumber);
  const [notes, setNotes] = useState(initialNotes);

  // Diskon nominal manual (tingkat dokumen). Hanya dihitung di sisi client,
  // TIDAK disimpan ke database. Nilai awal dipulihkan dari selisih sub total
  // item dengan grand total yang tersimpan (jika dulu ada diskon nominal).
  const [discountNominal, setDiscountNominal] = useState(() => {
    const initSub = (initialItems || []).reduce((sum: number, i: any) => {
      const lineTotal = (i.qty || 0) * (i.unit_price || 0);
      const disc = lineTotal * ((i.discount || 0) / 100);
      return sum + (lineTotal - disc);
    }, 0);
    const diff = Math.round(initSub - (initialGrandTotal || 0));
    return diff > 0 ? diff : 0;
  });
  // Bawa field `search` untuk combobox part code (diisi dari part_code awal)
  const [items, setItems] = useState<any[]>(
    initialItems.map((i) => ({
      ...i,
      search: i.part_code || "",
      discountRaw:
        i.discount !== undefined && i.discount !== null && i.discount !== 0
          ? String(i.discount).replace(".", ",")
          : "",
    })),
  );

  // Kontrol combobox part code
  const [openSearchIndex, setOpenSearchIndex] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const getFilteredProducts = (search: string) =>
    productsList
      .filter((p) =>
        p.part_code?.toLowerCase().includes(search.toLowerCase().trim()),
      )
      .slice(0, 50);

  // Auto-update master produk saat user mengubah harga / remark
  const updateProductField = async (
    productId: string,
    field: "price" | "remark",
    value: number | string,
  ) => {
    if (!productId) return;
    const res = await updateProductFieldAction(productId, field, value);
    if (!res.success) {
      toast.error(
        `Gagal memperbarui ${field === "price" ? "harga" : "keterangan"} produk di master data.`,
        "Sinkronisasi Gagal",
      );
    } else {
      toast.success(
        `${field === "price" ? "Harga" : "Keterangan"} produk diperbarui di master data.`,
        "Sinkronisasi Produk",
      );
      setProductsList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)),
      );
    }
  };

  const handleCustomerChange = async (custId: string) => {
    setSelectedCustomerId(custId);
    setSelectedAddressId("");
    const { data: addrs } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", custId);
    if (addrs) {
      setAddressesList(addrs);
      const def = addrs.find((a: any) => a.is_default);
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
        remark: prod.remark ?? "",
        search: prod.part_code,
        _db_price: prod.price,
        _db_remark: prod.remark ?? "",
      };
      setItems(newItems);
    }
    setOpenSearchIndex(null);
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Diskon per item mendukung desimal dengan koma, misal "22,22" (maks 100%)
  const updateDiscount = (index: number, rawText: string) => {
    let cleaned = rawText.replace(/[^\d.,]/g, "").replace(/\./g, ",");
    const parts = cleaned.split(",");
    let display = parts[0].slice(0, 3);
    if (parts.length > 1) {
      display =
        parts[0].slice(0, 3) + "," + parts.slice(1).join("").slice(0, 2);
    }
    let num = display ? parseFloat(display.replace(",", ".")) : 0;
    if (isNaN(num)) num = 0;
    if (num > 100) {
      num = 100;
      display = "100";
    }
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      discount: num,
      discountRaw: display,
    };
    setItems(newItems);
  };

  // Sub total = hasil sum amount tiap item (sudah termasuk diskon % per item)
  const subTotal = items.reduce((sum, i) => {
    const lineTotal = i.qty * i.unit_price;
    const discountAmount = lineTotal * ((i.discount || 0) / 100);
    return sum + (lineTotal - discountAmount);
  }, 0);

  // Cek apakah user input diskon nominal manual. Jika tidak, grand total = sub total.
  // Jika ada, kurangi sub total dengan diskon nominal tersebut.
  const grandTotal = Math.max(0, subTotal - (discountNominal || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (items.some((i) => !i.product_id)) {
      setError(
        "Peringatan: Ada baris barang yang belum dipilih produknya. Silakan lengkapi atau hapus baris tersebut.",
      );
      setIsSaving(false);
      return;
    }

    try {
      const itemsToInsert = items.map((i) => {
        const lineTotal = i.qty * i.unit_price;
        const discountAmount = lineTotal * ((i.discount || 0) / 100);
        return {
          quotation_id: id,
          product_id: i.product_id,
          qty: i.qty,
          unit_price: i.unit_price,
          discount: i.discount,
          total_price: lineTotal - discountAmount,
        };
      });

      const res = await updateQuotationAction(id, {
        customerId: selectedCustomerId,
        addressId: selectedAddressId,
        validUntil,
        mrNumber,
        notes,
        grandTotal,
        items: itemsToInsert,
      });

      if (!res.success) throw new Error(res.error);

      toast.success("Dokumen quotation berhasil diperbarui.", "Tersimpan");
      router.push(`/dashboard/quotations/${id}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(`Gagal menyimpan perubahan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10 animate-in fade-in duration-500">
      {/* HEADER ELEGAN */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Revisi Penawaran
          </h1>
          <p className="text-sm text-slate-500">
            Perbarui dokumen Quotation (QO) hasil negosiasi dengan pelanggan.
          </p>
        </div>
        <Link href={`/dashboard/quotations/${id}`} className="btn-secondary">
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
          Batal & Kembali
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
                  {/* Part Code (Searchable Combobox + Keyboard Nav) */}
                  <div className="md:col-span-2 relative">
                    <label className="md:hidden label-modern">Part Code</label>
                    <input
                      type="text"
                      required={!item.product_id}
                      value={item.search}
                      placeholder="Ketik part code..."
                      onChange={(e) => {
                        const val = e.target.value;
                        const newItems = [...items];
                        newItems[idx] = {
                          ...newItems[idx],
                          search: val,
                          product_id: "",
                          part_name: "",
                        };
                        setItems(newItems);
                        setOpenSearchIndex(idx);
                        setHighlightIndex(0);
                      }}
                      onFocus={() => {
                        setOpenSearchIndex(idx);
                        setHighlightIndex(0);
                      }}
                      onBlur={() =>
                        setTimeout(() => setOpenSearchIndex(null), 150)
                      }
                      onKeyDown={(e) => {
                        if (openSearchIndex !== idx) return;
                        const filtered = getFilteredProducts(item.search);
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightIndex((prev) =>
                            Math.min(prev + 1, filtered.length - 1),
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightIndex((prev) => Math.max(prev - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const chosen = filtered[highlightIndex];
                          if (chosen) handleProductSelect(idx, chosen.id);
                        } else if (e.key === "Escape") {
                          setOpenSearchIndex(null);
                        }
                      }}
                      className="input-modern py-2 font-mono text-xs"
                    />

                    {openSearchIndex === idx && item.search.trim() !== "" && (
                      <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                        {getFilteredProducts(item.search).map((p, i) => {
                          const isActive = i === highlightIndex;
                          return (
                            <button
                              type="button"
                              key={p.id}
                              ref={(el) => {
                                if (isActive && el)
                                  el.scrollIntoView({ block: "nearest" });
                              }}
                              onMouseDown={() => handleProductSelect(idx, p.id)}
                              onMouseEnter={() => setHighlightIndex(i)}
                              className={`w-full text-left px-3 py-2 text-xs border-b border-slate-50 last:border-0 ${
                                isActive ? "bg-blue-100" : "hover:bg-blue-50"
                              }`}
                            >
                              <span className="font-mono font-bold text-slate-800">
                                {p.part_code}
                              </span>
                              <span className="text-slate-400 ml-2">
                                {p.part_name}
                              </span>
                            </button>
                          );
                        })}

                        {getFilteredProducts(item.search).length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            Part code tidak ditemukan.
                          </div>
                        )}
                      </div>
                    )}
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
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        value={item.qty ? item.qty : ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          updateItemField(
                            idx,
                            "qty",
                            digits ? parseInt(digits, 10) : 0,
                          );
                        }}
                        className="input-modern py-2 text-center text-xs font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="md:hidden label-modern">
                        Harga Satuan (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={
                            item.unit_price
                              ? item.unit_price.toLocaleString("id-ID")
                              : ""
                          }
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            updateItemField(
                              idx,
                              "unit_price",
                              digits ? parseInt(digits, 10) : 0,
                            );
                          }}
                          onBlur={(e) => {
                            const val =
                              parseInt(e.target.value.replace(/\D/g, ""), 10) ||
                              0;
                            if (item.product_id && val !== item._db_price) {
                              updateProductField(item.product_id, "price", val);
                              updateItemField(idx, "_db_price", val);
                            }
                          }}
                          className="input-modern py-2 pl-9 text-right text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Discount & Total */}
                  <div className="grid grid-cols-2 gap-3 md:col-span-2 items-center">
                    <div>
                      <label className="md:hidden label-modern">Diskon %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={
                          item.discountRaw !== undefined
                            ? item.discountRaw
                            : item.discount
                              ? String(item.discount).replace(".", ",")
                              : ""
                        }
                        onChange={(e) => updateDiscount(idx, e.target.value)}
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
                      discountRaw: "",
                      remark: "",
                      search: "",
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
            <div className="w-full flex justify-between items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Sub Total
              </span>
              <span className="text-sm font-bold text-slate-200">
                Rp {subTotal.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="w-full flex justify-between items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Diskon (Rp)
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-rose-300">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={
                    discountNominal
                      ? discountNominal.toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    let num = digits ? parseInt(digits, 10) : 0;
                    if (num > subTotal) num = subTotal; // tidak boleh melebihi sub total
                    setDiscountNominal(num);
                  }}
                  className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right font-bold text-rose-300 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="w-full text-left md:text-right border-t border-slate-700 pt-3">
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
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-900/50 disabled:bg-slate-700 disabled:text-slate-400 transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Menyimpan Perubahan...
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
