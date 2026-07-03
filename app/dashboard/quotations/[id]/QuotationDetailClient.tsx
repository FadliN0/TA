"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateQuotationStatusAction,
  generateSalesOrderAction,
} from "./actions";

/* ─── Style helpers ─── */
const tdBase: React.CSSProperties = {
  padding: "2px 0",
  verticalAlign: "top",
  fontSize: 11,
};
const tdLabel: React.CSSProperties = {
  ...tdBase,
  width: 50,
  whiteSpace: "nowrap",
};
const tdColon: React.CSSProperties = { ...tdBase, width: 10, paddingRight: 6 };
const tdValue: React.CSSProperties = { ...tdBase };

const thStyle: React.CSSProperties = {
  border: "1px solid #bbb",
  padding: "6px 6px",
  textAlign: "center",
  background: "#ffffff",
  color: "#000000",
  fontWeight: 700,
  fontSize: 11,
};

const tdItem: React.CSSProperties = {
  border: "1px solid #bbb",
  padding: "5px 6px",
  fontSize: 11,
  verticalAlign: "middle",
};

type QuotationDetailClientProps = {
  id: string;
  initialQuotation: any;
  customer: any;
  address: any;
  items: any[];
  initialExistingSO: any;
};

export default function QuotationDetailClient({
  id,
  initialQuotation,
  customer,
  address,
  items,
  initialExistingSO,
}: QuotationDetailClientProps) {
  const router = useRouter();

  const [quotation, setQuotation] = useState<any>(initialQuotation);
  const [existingSO, setExistingSO] = useState<any>(initialExistingSO);

  const [isCreatingSO, setIsCreatingSO] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poInput, setPoInput] = useState("");

  const handlePrint = () => window.print();

  const handleUpdateStatus = async (newStatus: string) => {
    if (existingSO) {
      alert("Dokumen ini sudah terkunci karena Sales Order telah diterbitkan.");
      return;
    }

    const res = await updateQuotationStatusAction(id, newStatus);
    if (res.success) setQuotation({ ...quotation, status: newStatus });
  };

  const getValidityDays = () => {
    if (!quotation?.created_at || !quotation?.valid_until) return 0;
    const start = new Date(quotation.created_at).getTime();
    const end = new Date(quotation.valid_until).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleCreateSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poInput.trim()) {
      alert("Nomor PO dari klien wajib diisi!");
      return;
    }

    setIsCreatingSO(true);
    try {
      const itemsPayload = items.map((i) => ({
        product_id: i.product_id,
        qty: i.qty,
        unit_price: i.unit_price,
        discount: i.discount,
        total_price: i.total_price,
      }));

      const res = await generateSalesOrderAction({
        quotationId: id,
        poNumber: poInput.trim(),
        customerId: quotation.customer_id,
        addressId: quotation.address_id,
        grandTotal: quotation.grand_total,
        items: itemsPayload,
      });

      if (!res.success) throw new Error(res.error);

      const rpcResult = res.data;
      if (rpcResult && rpcResult.success) {
        alert(
          `Sukses! Dokumen Sales Order ${rpcResult.so_number} berhasil diterbitkan.`,
        );
        setExistingSO({ id: rpcResult.so_id, so_number: rpcResult.so_number });
        setIsPOModalOpen(false);
      } else {
        throw new Error(
          "Respons database tidak sesuai atau gagal memproses SO.",
        );
      }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal membuat SO: ${error.message}`);
    } finally {
      setIsCreatingSO(false);
    }
  };

  const isLocked = !!existingSO;

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-10 print:m-0 print:p-0 print:space-y-0 print:max-w-none text-black relative">
      {/* ── KONTROL UI ── */}
      <div className="print:hidden w-full max-w-[210mm] mx-auto card-modern p-5 md:p-6 border-l-4 border-l-blue-500 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* --- KIRI: TOMBOL KEMBALI & STATUS --- */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <Link
              href="/dashboard/quotations"
              className="inline-flex items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors border border-slate-200 shrink-0"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <div className="w-full sm:w-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Status Dokumen
              </span>

              {isLocked ? (
                // TAMPILAN JIKA TERKUNCI (SO SUDAH TERBIT)
                <div className="bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider w-full sm:w-auto text-center sm:text-left flex items-center justify-center sm:justify-start gap-2 cursor-not-allowed">
                  🔒 Terkunci (SO Terbit)
                </div>
              ) : (
                // TAMPILAN DROPDOWN JIKA BELUM TERKUNCI
                <select
                  value={quotation.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className={`text-xs font-black uppercase tracking-wider border-2 rounded-lg px-3 py-1.5 outline-none transition-colors cursor-pointer w-full sm:w-auto appearance-none text-center sm:text-left
                    ${
                      quotation.status === "Draft"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : quotation.status === "Sent"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : quotation.status === "Approved"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-rose-100 text-rose-700 border-rose-200"
                    }`}
                >
                  <option value="Draft">Draft (Belum Fix)</option>
                  <option value="Sent">Dikirim (Sent)</option>
                  <option value="Approved">Disetujui (Approved)</option>
                  <option value="Rejected">Ditolak (Rejected)</option>
                </select>
              )}
            </div>
          </div>

          {/* --- KANAN: TOMBOL AKSI (REVISI / BUAT SO / PRINT) --- */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              {isLocked ? (
                // TOMBOL LIHAT SO (MUNCUL JIKA TERKUNCI)
                <Link
                  href={`/dashboard/sales-orders/${existingSO?.id}`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px]"
                >
                  👁️ Lihat Dokumen SO
                </Link>
              ) : (
                <>
                  {/* TOMBOL BUAT SO (HANYA MUNCUL JIKA APPROVED) */}
                  {quotation.status === "Approved" && (
                    <button
                      onClick={() => setIsPOModalOpen(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-emerald-600/30 shadow-lg h-[40px]"
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
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Buat SO
                    </button>
                  )}

                  {/* TOMBOL REVISI (MUNCUL JIKA MASIH DRAFT/SENT/REJECTED) */}
                  {quotation.status !== "Approved" && (
                    <Link
                      href={`/dashboard/quotations/${id}/edit`}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px]"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Revisi
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* TOMBOL CETAK PDF (SELALU MUNCUL) */}
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px] mt-2 sm:mt-0"
            >
              🖨️ Cetak PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── WRAPPER PDF (KERTAS A4) ── */}
      <div className="w-full overflow-x-auto pb-8 custom-scrollbar print:overflow-visible print:pb-0 relative">
        <div
          className="bg-white shadow-xl border border-slate-200 print:shadow-none print:border-none mx-auto min-h-[297mm] print:min-h-0"
          style={{
            width: "210mm",
            padding: "20mm",
            boxSizing: "border-box",
            fontFamily: "'Noto Sans', Arial, sans-serif",
            fontSize: 11,
          }}
        >
          {/* ── HEADER: logo + nama perusahaan + alamat (kiri saja) ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <div style={{ width: 100, height: 65, flexShrink: 0 }}>
              <img
                src="/logo1.png"
                alt="CV. HJP Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "left",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                CV HARMONISINDO JAYA PART
              </div>
              <div style={{ fontSize: 10, color: "#444", lineHeight: 1.65 }}>
                SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman
                <br />
                Kav. 28, Kelurahan Tanjung Duren Selatan
                <br />
                Kec. Grogol Petamburan, Jakarta Barat
              </div>
            </div>
          </div>

          {/* ── BANNER SALES QUOTATION (full width) ── */}
          <div
            style={{
              background: "#487bc8",
              color: "#000000",
              textAlign: "center",
              padding: "5px 0",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>
              Sales Quotation
            </span>
          </div>

          {/* ── INFO (2 kolom) ── */}
          {/* ── INFO (1 tabel agar tiap baris kiri-kanan selalu sejajar) ── */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 16,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: 50 }} />   {/* label kiri */}
              <col style={{ width: 10 }} />   {/* titik dua kiri */}
              <col />                          {/* value kiri (fleksibel, nampung address) */}
              <col style={{ width: 24 }} />   {/* jarak antar kolom */}
              <col style={{ width: 55 }} />   {/* label kanan */}
              <col style={{ width: 10 }} />   {/* titik dua kanan */}
              <col style={{ width: 130 }} />  {/* value kanan */}
            </colgroup>
            <tbody>
              {/* Baris 1: TO | No */}
              <tr>
                <td style={{ ...tdLabel, verticalAlign: "top" }}>TO</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td
                  style={{
                    ...tdValue,
                    verticalAlign: "top",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {customer?.company_name}
                </td>
                <td />
                <td style={{ ...tdLabel, verticalAlign: "top" }}>No</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top", fontWeight: 700 }}>
                  {quotation.quotation_number}
                </td>
              </tr>

              {/* Baris 2: Address | MR No */}
              <tr>
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Address</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td
                  style={{

                    ...tdValue,
                    verticalAlign: "top",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {address?.complete_address}
                </td>
                <td />
                <td style={{ ...tdLabel, verticalAlign: "top" }}>MR No</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top", fontWeight: 500 }}>
                  {quotation.mr_number || "-"}
                </td>
              </tr>

              {/* Baris 3: Telp | Date */}
              <tr>
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Telp</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top" }}>
                  {address?.pic_phone ? `${address.pic_phone}` : ""}
                </td>
                <td />
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Date</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top" }}>
                  {new Date(quotation.created_at)
                    .toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    .replace(/ /g, "-")}
                </td>
              </tr>

              {/* Baris 4: Email | Validity */}
              <tr>
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Email</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top" }}>
                  {customer?.email || ""}
                </td>
                <td />
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Validity</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top" }}>
                  {getValidityDays()} Days
                </td>
              </tr>

              {/* Baris 5: Fax | Attn — baris paling bawah, dijamin sejajar */}
              <tr>
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Fax</td>
                <td style={{ ...tdColon, verticalAlign: "top" }}>:</td>
                <td style={{ ...tdValue, verticalAlign: "top" }} />
                <td />
                <td style={{ ...tdLabel, verticalAlign: "top" }}>Attn</td>
                <td style={{ ...tdColon, verticalAlign: "top" } }>:</td>
                <td style={{ ...tdValue, verticalAlign: "top" }}>
                  {address?.pic_name || ""}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── TABEL BARANG ── */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 18,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: 30 }} /> {/* No */}
              <col style={{ width: 95 }} /> {/* Part Number */}
              <col style={{ width: 160 }} /> {/* Description */}
              <col style={{ width: 32 }} /> {/* Qty */}
              <col style={{ width: 32 }} /> {/* Unit */}
              <col style={{ width: 93 }} /> {/* Unit Price */}
              <col style={{ width: 35 }} /> {/* Disc */}
              <col /> {/* Amount */}
              <col style={{ width: 55 }} /> {/* Remark */}
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>No</th>
                <th style={thStyle}>Part Number</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle} colSpan={2}>
                  Qty
                </th>
                <th style={thStyle}>Unit Price</th>
                <th style={thStyle}>Disc</th>
                <th style={thStyle}>Amount (IDR)</th>
                <th style={thStyle}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ ...tdItem, textAlign: "center" }}>
                    {index + 1}
                  </td>
                  <td style={{ ...tdItem, fontWeight: 200 }}>
                    {item.products?.part_code}
                  </td>
                  <td style={tdItem}>
                    <div style={{ lineHeight: 1.4 }}>
                      {item.products?.part_name}
                    </div>
                  </td>
                  <td style={{ ...tdItem, textAlign: "center" }}>{item.qty}</td>
                  <td style={{ ...tdItem, textAlign: "left" }}>
                    {item.products?.unit}
                  </td>
                  <td style={{ ...tdItem, whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Rp.</span>
                      <span>{item.unit_price?.toLocaleString("id-ID")}</span>
                    </div>
                  </td>
                  <td style={{ ...tdItem, textAlign: "center" }}>
                    {item.discount > 0 ? `${item.discount}%` : ""}
                  </td>
                  <td
                    style={{ ...tdItem, whiteSpace: "nowrap", fontWeight: 200 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Rp.</span>
                      <span>{item.total_price?.toLocaleString("id-ID")}</span>
                    </div>
                  </td>
                  <td style={{ ...tdItem, textAlign: "center" }}>
                    {item.products?.remark || ""}
                  </td>
                </tr>
              ))}

              {/* Baris kosong pengisi agar tabel terlihat penuh */}
              {Array.from({ length: Math.max(0, 10 - items.length) }).map(
                (_, i) => (
                  <tr key={`empty-${i}`}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} style={{ ...tdItem, height: 22 }} />
                    ))}
                  </tr>
                ),
              )}

              {/* ── BARIS TOTAL ── */}
              <tr style={{ pageBreakInside: "avoid" }}>
                <td
                  colSpan={7}
                  style={{
                    ...tdItem,
                    textAlign: "right",
                    fontWeight: 700,
                    border: "none",
                    borderTop: "1px solid #bbb",
                  }}
                >
                  Total
                </td>
                <td
                  style={{ ...tdItem, fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Rp.</span>
                    <span>
                      {quotation.grand_total?.toLocaleString("id-ID")}
                    </span>
                  </div>
                </td>
                <td style={{ border: "none", borderTop: "1px solid #bbb" }} />
              </tr>
            </tbody>
          </table>

          {/* ── CATATAN ── */}
          <div style={{ marginBottom: 32, pageBreakInside: "avoid" }}>
            <p
              style={{
                margin: "0 0 4px",
                fontWeight: 700,
                textDecoration: "underline",
                fontSize: 11,
              }}
            >
              NOTE :
            </p>
            <div
              style={{
                whiteSpace: "pre-wrap",
                margin: "0 0 10px",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              {quotation.notes ? quotation.notes : "Ready Stock\nFranco Site"}
            </div>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                color: "#b00000",
                fontStyle: "italic",
                fontSize: 11,
              }}
            >
              All payment to Bank MANDIRI No. 1560024959530 a.n CV HARMONISINDO
              JAYA PART
            </p>
          </div>

          {/* ── TANDA TANGAN ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              pageBreakInside: "avoid",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11 }}>Quote by,</p>
              <div style={{ height: 64 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  textDecoration: "underline",
                }}
              >
                Fatin
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 11 }}>Approved by,</p>
              <div style={{ height: 64 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  textDecoration: "underline",
                }}
              >
                {address?.pic_name || "................................"}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* ── AKHIR WRAPPER PDF ── */}

      {/* ── MODAL CONVERT KE SALES ORDER ── */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center p-4 print:hidden items-end sm:items-center sm:p-6 overflow-y-auto">
          <form
            onSubmit={handleCreateSO}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col my-auto animate-in slide-in-from-bottom-10 sm:scale-in-center duration-300"
          >
            <div className="shrink-0 bg-blue-600 p-5 text-white flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-xl font-black">Convert ke Sales Order</h2>
                <p className="text-blue-100 text-xs font-mono mt-0.5">
                  {quotation.quotation_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPOModalOpen(false)}
                className="text-blue-200 hover:text-white bg-blue-700/50 hover:bg-blue-700 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-center border border-blue-200 shadow-inner">
                <span className="text-xs font-bold block mb-1">
                  Quotation ini akan diubah menjadi Dokumen Sales Order resmi.
                </span>
              </div>
              <div>
                <label className="label-modern text-blue-900">
                  Nomor PO (Purchase Order) Klien *
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-4 top-3 font-bold text-slate-400">
                    PO-
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Misal: 025/PAMA/2026"
                    value={poInput}
                    onChange={(e) => setPoInput(e.target.value)}
                    className="input-modern pl-12 text-sm font-bold text-blue-900 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  * Nomor PO ini akan menjadi referensi utama di dokumen Sales
                  Order dan Invoice nantinya.
                </p>
              </div>
            </div>

            <div className="shrink-0 p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsPOModalOpen(false)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingSO}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm disabled:bg-blue-300 transition-colors"
              >
                {isCreatingSO ? "Memproses..." : "Buat Sales Order"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
