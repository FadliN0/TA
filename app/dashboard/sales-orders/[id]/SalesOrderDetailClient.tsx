"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateSalesOrderStatusAction, createInvoiceFromSoAction } from "./actions";

export default function SalesOrderDetailClient({
  salesOrder: initialSalesOrder,
  customer,
  address,
  items,
  hasDO,
  hasInvoice,
}: {
  salesOrder: any;
  customer: any;
  address: any;
  items: any[];
  hasDO: boolean;
  hasInvoice: boolean;
}) {
  const router = useRouter();
  const [salesOrder, setSalesOrder] = useState<any>(initialSalesOrder);
  const [isCreatingInvoice, startInvoiceTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const handlePrint = () => window.print();

  const handleUpdateStatus = (newStatus: string) => {
    if (newStatus === "Completed") {
      alert(
        "Status Completed hanya bisa diubah otomatis oleh sistem ketika semua Surat Jalan (DO) sudah terkirim!",
      );
      return;
    }
    if (newStatus === "Cancelled" && (hasDO || hasInvoice)) {
      alert(
        "Tidak bisa membatalkan SO ini karena Surat Jalan (DO) atau Invoice sudah diterbitkan!",
      );
      return;
    }

    startStatusTransition(async () => {
      try {
        await updateSalesOrderStatusAction(salesOrder.id, newStatus);
        setSalesOrder({ ...salesOrder, status: newStatus });
        router.refresh();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleCreateDO = () => {
    router.push(`/dashboard/delivery-orders/create?so_id=${salesOrder.id}`);
  };

  const handleCreateInvoice = () => {
    const confirm = window.confirm(
      "Buat Invoice Penagihan resmi untuk pesanan ini?",
    );
    if (!confirm) return;

    startInvoiceTransition(async () => {
      try {
        const { invoice_number } = await createInvoiceFromSoAction(
          salesOrder.id,
        );
        alert(
          `Luar biasa! Invoice ${invoice_number} berhasil digenerate oleh sistem.`,
        );
        router.push("/dashboard/invoices");
      } catch (error: any) {
        alert(`Gagal membuat Invoice: ${error.message}`);
      }
    });
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-10 print:m-0 print:p-0 print:max-w-none text-black relative">
      {/* ── KONTROL UI (GAYA MODERN FIT TO A4) ── */}
      <div className="print:hidden w-full max-w-[210mm] mx-auto card-modern p-5 md:p-6 border-l-4 border-l-slate-800 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Kiri: Tombol Kembali & Dropdown Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <Link
              href="/dashboard/sales-orders"
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
                Status SO
              </span>
              <select
                value={salesOrder.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={
                  salesOrder.status === "Completed" ||
                  hasDO ||
                  hasInvoice ||
                  isUpdatingStatus
                }
                className={`input-modern font-bold ${salesOrder.status === "Completed" || hasDO || hasInvoice ? "opacity-80 cursor-not-allowed" : ""}`}
              >
                <option value="Open">Open</option>
                <option value="Processing">Processing</option>
                {salesOrder.status === "Completed" && (
                  <option value="Completed">Completed</option>
                )}
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Kanan: Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              {/* Logika DO */}
              {salesOrder.status !== "Cancelled" &&
              salesOrder.status !== "Completed" &&
              !hasDO ? (
                <button
                  onClick={handleCreateDO}
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  Buat DO
                </button>
              ) : hasDO ? (
                <Link
                  href="/dashboard/delivery-orders"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-sm transition-colors h-[40px]"
                >
                  ✓ Lihat DO
                </Link>
              ) : null}

              {/* Logika Invoice */}
              {salesOrder.status !== "Cancelled" &&
              salesOrder.status !== "Completed" &&
              !hasInvoice ? (
                <button
                  onClick={handleCreateInvoice}
                  disabled={isCreatingInvoice}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-blue-600/30 shadow-lg h-[40px] disabled:opacity-60"
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {isCreatingInvoice ? "Memproses..." : "Buat INV"}
                </button>
              ) : hasInvoice ? (
                <Link
                  href="/dashboard/invoices"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl font-bold text-sm transition-colors h-[40px]"
                >
                  ✓ Lihat INV
                </Link>
              ) : null}
            </div>

            {/* Tombol Print */}
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm h-[40px] mt-2 sm:mt-0"
            >
              🖨️ Cetak PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── WRAPPER PDF (KERTAS A4) ── */}
      <div className="w-full overflow-x-auto pb-8 custom-scrollbar print:overflow-visible print:pb-0">
        {/* KERTAS A4 */}
        <div
          className="bg-white shadow-xl border border-slate-200 print:shadow-none print:border-none mx-auto relative overflow-hidden"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "40px 48px",
            fontFamily: "'Noto Sans', Arial, sans-serif",
            fontSize: 11,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 80, height: 80, flexShrink: 0 }}>
                <img
                  src="/logo1.png"
                  alt="CV. HJP Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <div style={{ paddingTop: 4 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#2c3e50",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  CV HARMONISINDO JAYA PART
                </div>
                <div style={{ fontSize: 10, color: "#444", lineHeight: 1.5 }}>
                  SOHO CAPITAL lantai. 32 unit 7 Jl. Letjen S. Parman
                  <br />
                  Kav. 28, Kelurahan Tanjung Duren Selatan
                  <br />
                  Kec. Grogol Petamburan, Jakarta Barat
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  background: "#2c3e50",
                  color: "#fff",
                  padding: "10px 28px",
                  borderRadius: 4,
                  display: "inline-block",
                }}
              >
                <span
                  style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2 }}
                >
                  SALES ORDER
                </span>
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "#555",
                  marginTop: 6,
                  fontWeight: "bold",
                }}
              >
                ( ORDER CONFIRMATION )
              </p>
            </div>
          </div>

          <hr
            style={{
              border: "none",
              borderTop: "2px solid #2c3e50",
              margin: "20px 0 16px",
            }}
          />

          {/* INFO */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.7fr",
              gap: "0 24px",
              marginBottom: 20,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col style={{ width: 70 }} />
                <col style={{ width: 15 }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td style={tdLabel}>ORDER BY</td>
                  <td style={tdColon}>:</td>
                  <td style={{ ...tdValue, fontWeight: 900, fontSize: 12 }}>
                    {customer?.company_name}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ ...tdLabel, verticalAlign: "top", paddingTop: 6 }}
                  >
                    SHIP TO
                  </td>
                  <td
                    style={{ ...tdColon, verticalAlign: "top", paddingTop: 6 }}
                  >
                    :
                  </td>
                  <td
                    style={{
                      ...tdValue,
                      paddingTop: 6,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      lineHeight: 1.5,
                    }}
                  >
                    {address?.complete_address}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...tdLabel, paddingTop: 8 }}>ATTN</td>
                  <td style={{ ...tdColon, paddingTop: 8 }}>:</td>
                  <td style={{ ...tdValue, paddingTop: 8, fontWeight: 800 }}>
                    {address?.pic_name || "-"} ({address?.pic_phone || "-"})
                  </td>
                </tr>
              </tbody>
            </table>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={tdLabel}>SO No.</td>
                  <td style={tdColon}>:</td>
                  <td style={{ ...tdValue, fontWeight: 900, fontSize: 12 }}>
                    {salesOrder.so_number}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...tdLabel, paddingTop: 6 }}>Date</td>
                  <td style={{ ...tdColon, paddingTop: 6 }}>:</td>
                  <td style={{ ...tdValue, paddingTop: 6 }}>
                    {new Date(salesOrder.created_at).toLocaleDateString(
                      "en-GB",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ paddingTop: 16 }}>
                    <div
                      style={{
                        background: "#f8f9fa",
                        border: "1px solid #ccc",
                        padding: "8px 12px",
                        borderRadius: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "#666",
                          fontWeight: "bold",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        CUSTOMER P.O NUMBER :
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: "#d35400",
                          display: "block",
                        }}
                      >
                        {salesOrder.po_number || "TIDAK ADA PO"}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL BARANG */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 20,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: 32 }} /> <col style={{ width: 110 }} />{" "}
              <col /> <col style={{ width: 30 }} />{" "}
              <col style={{ width: 35 }} /> <col style={{ width: 100 }} />{" "}
              <col style={{ width: 40 }} /> <col style={{ width: 110 }} />
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
                <th style={thStyle}>Total (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ ...tdItem, textAlign: "center" }}>
                    {index + 1}
                  </td>
                  <td style={{ ...tdItem, fontWeight: 800 }}>
                    {item.products?.part_code}
                  </td>
                  <td
                    style={{
                      ...tdItem,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    <div style={{ lineHeight: 1.4, fontWeight: 800 }}>
                      {item.products?.part_name}
                    </div>
                    {item.products?.remark && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#888",
                          fontStyle: "italic",
                          marginTop: 2,
                        }}
                      >
                        ({item.products.remark})
                      </div>
                    )}
                    {item.item_note && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#888",
                          fontStyle: "italic",
                          marginTop: 2,
                        }}
                      >
                        ({item.item_note})
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      ...tdItem,
                      textAlign: "center",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {item.qty}
                  </td>
                  <td style={{ ...tdItem, textAlign: "center" }}>
                    {item.products?.unit}
                  </td>
                  <td style={{ ...tdItem, whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Rp</span>
                      <span>{item.unit_price?.toLocaleString("id-ID")}</span>
                    </div>
                  </td>
                  <td style={{ ...tdItem, textAlign: "center" }}>
                    {item.discount > 0 ? `${item.discount}%` : "-"}
                  </td>
                  <td
                    style={{ ...tdItem, whiteSpace: "nowrap", fontWeight: 900 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Rp</span>
                      <span>{item.total_price?.toLocaleString("id-ID")}</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ pageBreakInside: "avoid" }}>
                <td
                  colSpan={7}
                  style={{
                    ...tdItem,
                    textAlign: "right",
                    fontWeight: 900,
                    fontSize: 12,
                    paddingRight: 16,
                    borderTop: "2px solid #ccc",
                  }}
                >
                  GRAND TOTAL
                </td>
                <td
                  style={{
                    ...tdItem,
                    fontWeight: 900,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    color: "#2c3e50",
                    borderTop: "2px solid #ccc",
                    background: "#f8f9fa",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Rp</span>
                    <span>
                      {salesOrder.grand_total?.toLocaleString("id-ID")}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* INTERNAL NOTES */}
          <div style={{ marginBottom: 40, pageBreakInside: "avoid" }}>
            <p
              style={{
                margin: "0 0 4px",
                fontWeight: 800,
                fontSize: 10,
                background: "#f1f1f1",
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: "4px 4px 0 0",
              }}
            >
              INTERNAL REMARKS / INSTRUCTIONS :
            </p>
            <div
              style={{
                border: "1px dashed #ccc",
                padding: "12px",
                minHeight: "60px",
                fontSize: 11,
                fontStyle: "italic",
                color: "#555",
                borderRadius: "0 4px 4px 4px",
              }}
            >
              {salesOrder.notes ||
                "Harap diproses sesuai standard operasi perusahaan. Segera terbitkan Surat Jalan (Delivery Order) jika barang sudah siap."}
            </div>
          </div>

          {/* TANDA TANGAN */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0 20px",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ textAlign: "center", width: "25%" }}>
              <p style={{ margin: 0, fontSize: 10, color: "#666" }}>
                Prepared By,
              </p>
              <div style={{ height: 70 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  textDecoration: "underline",
                }}
              >
                Tim Admin Sales
              </p>
              <p
                style={{ margin: 0, fontSize: 9, color: "#999", marginTop: 4 }}
              >
                Date: ........................
              </p>
            </div>
            <div style={{ textAlign: "center", width: "25%" }}>
              <p style={{ margin: 0, fontSize: 10, color: "#666" }}>
                Authorized By,
              </p>
              <div style={{ height: 70 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  textDecoration: "underline",
                }}
              >
                ..........................................
              </p>
              <p
                style={{ margin: 0, fontSize: 9, color: "#999", marginTop: 4 }}
              >
                Sales Manager / Director
              </p>
            </div>
            <div style={{ textAlign: "center", width: "25%" }}>
              <p style={{ margin: 0, fontSize: 10, color: "#666" }}>
                Checked By (Warehouse),
              </p>
              <div style={{ height: 70 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  textDecoration: "underline",
                }}
              >
                ..........................................
              </p>
              <p
                style={{ margin: 0, fontSize: 9, color: "#999", marginTop: 4 }}
              >
                Kepala Gudang
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Style helpers ─── */
const tdBase: React.CSSProperties = {
  padding: "2px 0",
  verticalAlign: "top",
  fontSize: 11,
};
const tdLabel: React.CSSProperties = {
  ...tdBase,
  fontWeight: 800,
  whiteSpace: "nowrap",
  color: "#555",
};
const tdColon: React.CSSProperties = {
  ...tdBase,
  width: 12,
  textAlign: "center",
};
const tdValue: React.CSSProperties = { ...tdBase, color: "#000" };
const thStyle: React.CSSProperties = {
  border: "1px solid #2c3e50",
  padding: "8px 6px",
  textAlign: "center",
  background: "#2c3e50",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 10,
  textTransform: "uppercase",
};
const tdItem: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "8px 6px",
  fontSize: 11,
  verticalAlign: "middle",
};
