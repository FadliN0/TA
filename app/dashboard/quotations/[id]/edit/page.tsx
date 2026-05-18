'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useToast } from '@/components/ui/Alert';

export default function EditQuotationPage() {
  const router = useRouter();
  const { id } = useParams();
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productsList, setProductsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [addressesList, setAddressesList] = useState<any[]>([]);

  const [quotationNumber, setQuotationNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [mrNumber, setMrNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const { data: prods } = await supabase
        .from('products').select('*').order('part_code');
      const { data: custs } = await supabase
        .from('customers').select('*').order('company_name');
      if (prods) setProductsList(prods);
      if (custs) setCustomersList(custs);

      const { data: quote, error: qErr } = await supabase
        .from('quotations').select('*').eq('id', id).single();
      if (qErr) throw qErr;

      setQuotationNumber(quote.quotation_number);
      setValidUntil(quote.valid_until);
      setSelectedCustomerId(quote.customer_id);
      setSelectedAddressId(quote.address_id);
      setMrNumber(quote.mr_number || '');
      setNotes(quote.notes || '');

      const { data: addrs } = await supabase
        .from('customer_addresses').select('*').eq('customer_id', quote.customer_id);
      if (addrs) setAddressesList(addrs);

      const { data: itemsData, error: iErr } = await supabase
        .from('quotation_items')
        // ── tambahkan remark di select ──
        .select(`*, products(part_code, part_name, unit, price, remark)`)
        .eq('quotation_id', id);
      if (iErr) throw iErr;

      const formattedItems = itemsData.map(i => ({
        product_id:  i.product_id,
        part_code:   i.products?.part_code  ?? '',
        part_name:   i.products?.part_name  ?? '',
        unit:        i.products?.unit       ?? '',
        qty:         i.qty,
        unit_price:  i.unit_price,
        discount:    i.discount ?? 0,
        remark:      i.products?.remark     ?? '',   // ← field baru
        _db_price:   i.products?.price      ?? i.unit_price,
        _db_remark:  i.products?.remark     ?? '',
      }));
      setItems(formattedItems);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Auto-update master produk saat user mengubah harga / remark ─────────────
  const updateProductField = async (
    productId: string,
    field: 'price' | 'remark',
    value: number | string
  ) => {
    if (!productId) return;
    const { error } = await supabase
      .from('products')
      .update({ [field]: value })
      .eq('id', productId);

    if (error) {
      toast.error(
        `Gagal memperbarui ${field === 'price' ? 'harga' : 'keterangan'} produk di master data.`,
        'Sinkronisasi Gagal'
      );
    } else {
      toast.success(
        `${field === 'price' ? 'Harga' : 'Keterangan'} produk berhasil diperbarui di master data.`,
        'Sinkronisasi Produk'
      );
      // update state lokal agar konsisten
      setProductsList(prev =>
        prev.map(p => p.id === productId ? { ...p, [field]: value } : p)
      );
    }
  };

  const handleCustomerChange = async (custId: string) => {
    setSelectedCustomerId(custId);
    setSelectedAddressId('');
    const { data: addrs } = await supabase
      .from('customer_addresses').select('*').eq('customer_id', custId);
    if (addrs) {
      setAddressesList(addrs);
      const def = addrs.find((a: any) => a.is_default);
      if (def) setSelectedAddressId(def.id);
      else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
    }
  };

  const handleProductSelect = (index: number, pid: string) => {
    const prod = productsList.find(p => p.id === pid);
    if (prod) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        product_id:  prod.id,
        part_code:   prod.part_code,
        part_name:   prod.part_name,
        unit:        prod.unit,
        unit_price:  prod.price,
        remark:      prod.remark ?? '',
        _db_price:   prod.price,
        _db_remark:  prod.remark ?? '',
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
    setIsSaving(true);
    setError(null);

    try {
      const { error: qErr } = await supabase
        .from('quotations')
        .update({
          customer_id:  selectedCustomerId,
          address_id:   selectedAddressId,
          valid_until:  validUntil,
          mr_number:    mrNumber,
          notes:        notes,
          grand_total:  grandTotal,
          status:       'Draft',
        })
        .eq('id', id);
      if (qErr) throw qErr;

      const { error: delErr } = await supabase
        .from('quotation_items').delete().eq('quotation_id', id);
      if (delErr) throw delErr;

      const itemsToInsert = items.map(i => {
        const lineTotal = i.qty * i.unit_price;
        const discountAmount = lineTotal * ((i.discount || 0) / 100);
        return {
          quotation_id: id,
          product_id:   i.product_id,
          qty:          i.qty,
          unit_price:   i.unit_price,
          discount:     i.discount,
          total_price:  lineTotal - discountAmount,
        };
      });

      const { error: iErr } = await supabase.from('quotation_items').insert(itemsToInsert);
      if (iErr) throw iErr;

      toast.success('Dokumen quotation berhasil diperbarui.', 'Tersimpan');
      router.push(`/dashboard/quotations/${id}`);
      router.refresh();

    } catch (err: any) {
      console.error(err);
      setError(`Gagal menyimpan perubahan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="p-8 text-center text-gray-500">Menyiapkan data dokumen...</div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Quotation</h1>
          <p className="text-sm text-gray-500">
            Ubah data pelanggan, masa berlaku, atau daftar barang.
          </p>
        </div>
        <Link
          href={`/dashboard/quotations/${id}`}
          className="text-sm text-blue-600 font-bold hover:underline"
        >
          Batal & Kembali
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl shadow-sm p-8 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded border border-red-100 text-sm font-bold">
            {error}
          </div>
        )}

        {/* ── INFO DOKUMEN & KLIEN ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Quotation Number</label>
              <input
                type="text" readOnly value={quotationNumber}
                className="w-full border p-2 rounded mt-1 font-mono text-sm bg-gray-100 cursor-not-allowed text-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Valid Until</label>
                <input
                  type="date" required value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full border p-2 rounded mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-blue-500 uppercase">MR / Ref Number</label>
                <input
                  type="text" value={mrNumber}
                  onChange={e => setMrNumber(e.target.value)}
                  placeholder="Contoh: MR-030093"
                  className="w-full border border-blue-200 p-2 rounded mt-1 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Customer (B2B)</label>
              <select
                required value={selectedCustomerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full border p-2 rounded mt-1 text-sm bg-white"
              >
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Shipping Address</label>
              <select
                required value={selectedAddressId}
                onChange={e => setSelectedAddressId(e.target.value)}
                className="w-full border p-2 rounded mt-1 text-sm bg-white"
              >
                {addressesList.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.address_type}] {a.pic_name} - {a.complete_address}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── ITEM ROWS ── */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700">Rincian Part Items</h3>

          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-4 rounded-lg border"
            >
              {/* Part Code */}
              <div className="flex-1 min-w-[130px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Part Code</label>
                <select
                  required
                  value={item.product_id}
                  onChange={e => handleProductSelect(idx, e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-white font-mono mt-1"
                >
                  <option value="">-- Select --</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>{p.part_code}</option>
                  ))}
                </select>
              </div>

              {/* Part Name — read only */}
              <div className="flex-[2] min-w-[160px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Part Name</label>
                <input
                  type="text" readOnly
                  value={item.part_name || ''}
                  className="w-full border p-2 rounded text-sm bg-gray-200 mt-1"
                />
              </div>

              {/* Qty */}
              <div className="w-20">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-center block">Qty</label>
                <input
                  type="number" min="1"
                  value={item.qty}
                  onChange={e => updateItemField(idx, 'qty', parseInt(e.target.value) || 0)}
                  className="w-full border p-2 rounded text-sm text-center mt-1"
                />
              </div>

              {/* Price — onBlur sync ke DB */}
              <div className="w-32">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">
                  Price (Rp)
                </label>
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={e => updateItemField(idx, 'unit_price', parseInt(e.target.value) || 0)}
                  onBlur={e => {
                    const val = parseInt(e.target.value) || 0;
                    if (item.product_id && val !== item._db_price) {
                      updateProductField(item.product_id, 'price', val);
                      updateItemField(idx, '_db_price', val);
                    }
                  }}
                  className="w-full border p-2 rounded text-sm text-right mt-1"
                />
              </div>

              {/* Discount */}
              <div className="w-20">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">Disc (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={item.discount}
                  onChange={e => updateItemField(idx, 'discount', parseFloat(e.target.value) || 0)}
                  className="w-full border p-2 rounded text-sm text-right mt-1 text-red-600 font-bold"
                />
              </div>

              {/* Remark — onBlur sync ke DB */}
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Keterangan</label>
                <input
                  type="text"
                  placeholder="Opsional..."
                  value={item.remark || ''}
                  onChange={e => updateItemField(idx, 'remark', e.target.value)}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (item.product_id && val !== item._db_remark) {
                      updateProductField(item.product_id, 'remark', val);
                      updateItemField(idx, '_db_remark', val);
                    }
                  }}
                  className="w-full border p-2 rounded text-sm mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* Hapus baris */}
              <button
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                className="mb-2 text-red-400 hover:text-red-600 p-1 font-bold flex-shrink-0"
                title="Hapus baris"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setItems([...items, {
              product_id: '', part_code: '', part_name: '', unit: '',
              qty: 1, unit_price: 0, discount: 0,
              remark: '', _db_price: 0, _db_remark: '',
            }])}
            className="text-blue-600 text-xs font-bold hover:underline"
          >
            + TAMBAH BARANG
          </button>
        </div>

        {/* ── NOTES ── */}
        <div className="pt-6 border-t">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Catatan Dokumen (NOTE)</label>
          <textarea
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ketik catatan tambahan di sini..."
            className="w-full border p-3 rounded-md mt-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* ── FOOTER ── */}
        <div className="flex justify-between items-center pt-8 border-t">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Grand Total</p>
            <p className="text-3xl font-black text-blue-700">
              Rp {grandTotal.toLocaleString('id-ID')}
            </p>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg disabled:bg-blue-300 transition-all uppercase tracking-wider"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}