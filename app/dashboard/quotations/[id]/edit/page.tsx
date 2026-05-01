'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function EditQuotationPage() {
  const router = useRouter();
  const { id } = useParams(); // ID dokumen lama (Parent)
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productsList, setProductsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [addressesList, setAddressesList] = useState<any[]>([]);

  // State Form
  const [quotationNumber, setQuotationNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [mrNumber, setMrNumber] = useState(''); // Fitur MR Klien yang sudah kita buat
  const [notes, setNotes] = useState('');
  const [revisionNumber, setRevisionNumber] = useState(0);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const { data: prods } = await supabase.from('products').select('*').order('part_code');
      const { data: custs } = await supabase.from('customers').select('*').order('company_name');
      if (prods) setProductsList(prods);
      if (custs) setCustomersList(custs);

      // Tarik Data Quotation Lama sebagai acuan pengisian Form
      const { data: quote, error: qErr } = await supabase.from('quotations').select('*').eq('id', id).single();
      if (qErr) throw qErr;

      setQuotationNumber(quote.quotation_number);
      setValidUntil(quote.valid_until);
      setSelectedCustomerId(quote.customer_id);
      setSelectedAddressId(quote.address_id);
      setMrNumber(quote.mr_number || '');
      setNotes(quote.notes || 'Ready Stock\nFranco Site');
      setRevisionNumber(quote.revision_number);

      const { data: addrs } = await supabase.from('customer_addresses').select('*').eq('customer_id', quote.customer_id);
      if (addrs) setAddressesList(addrs);

      // Tarik Item Lama untuk diedit di UI
      const { data: itemsData, error: iErr } = await supabase
        .from('quotation_items')
        .select(`*, products(part_code, part_name, unit, price)`)
        .eq('quotation_id', id);
      
      if (iErr) throw iErr;

      const formattedItems = itemsData.map(i => ({
        product_id: i.product_id,
        part_code: i.products?.part_code,
        part_name: i.products?.part_name,
        unit: i.products?.unit,
        qty: i.qty,
        unit_price: i.unit_price,
        discount: i.discount, // Persentase
        item_note: i.item_note || ''
      }));
      setItems(formattedItems);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerChange = async (custId: string) => {
    setSelectedCustomerId(custId);
    setSelectedAddressId('');
    const { data: addrs } = await supabase.from('customer_addresses').select('*').eq('customer_id', custId);
    if (addrs) {
      setAddressesList(addrs);
      const def = addrs.find(a => a.is_default);
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
        product_id: prod.id,
        part_code: prod.part_code,
        part_name: prod.part_name,
        unit: prod.unit,
        unit_price: prod.price
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
      // 1. GENERATE NOMOR REVISI BARU
      // Jika nomor aslinya 'QO-...-001', revisi ke-1 jadi 'QO-...-001-R1'
      // Jika sedang mengedit 'QO-...-001-R1', revisi ke-2 jadi 'QO-...-001-R2'
      const baseNumber = quotationNumber.split('-R')[0]; // Membuang akhiran -R lama jika ada
      const newRevNumber = revisionNumber + 1;
      const newQuotationNumber = `${baseNumber}-R${newRevNumber}`;

      // 2. INSERT DOKUMEN BARU
      const { data: newQuote, error: qErr } = await supabase.from('quotations').insert([{
        quotation_number: newQuotationNumber, // Menggunakan nomor dengan akhiran -R
        customer_id: selectedCustomerId,
        address_id: selectedAddressId,
        valid_until: validUntil,
        mr_number: mrNumber,
        notes: notes,
        grand_total: grandTotal,
        parent_id: id, 
        status: 'Draft' 
      }]).select().single();

      if (qErr) throw qErr;

      // 3. INSERT ITEM KE DOKUMEN BARU
      const itemsToInsert = items.map(i => {
        const lineTotal = i.qty * i.unit_price;
        const discountAmount = lineTotal * ((i.discount || 0) / 100);
        return {
          quotation_id: newQuote.id, 
          product_id: i.product_id,
          qty: i.qty,
          unit_price: i.unit_price,
          discount: i.discount,
          total_price: lineTotal - discountAmount,
          item_note: i.item_note
        };
      });

      const { error: iErr } = await supabase.from('quotation_items').insert(itemsToInsert);
      if (iErr) throw iErr;

      router.push(`/dashboard/quotations/${newQuote.id}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Menyiapkan data dokumen...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Revisi Quotation</h1>
          <p className="text-sm text-gray-500">
            Akan membuat Revisi ke-{revisionNumber + 1} (Dokumen lama akan dikunci otomatis)
          </p>
        </div>
        <Link href={`/dashboard/quotations/${id}`} className="text-sm text-blue-600">Batal & Kembali</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl shadow-sm p-8 space-y-8">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded border border-red-100 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Quotation Number</label>
              <input type="text" readOnly value={quotationNumber} className="w-full border p-2 rounded mt-1 font-mono text-sm bg-gray-100 cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Valid Until</label>
                <input type="date" required value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-blue-500 uppercase">MR / Ref Number</label>
                <input type="text" value={mrNumber} onChange={e => setMrNumber(e.target.value)} placeholder="Contoh: MR-030093" className="w-full border border-blue-200 p-2 rounded mt-1 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Customer (B2B)</label>
              <select required value={selectedCustomerId} onChange={e => handleCustomerChange(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm bg-white">
                {customersList.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Shipping Address</label>
              <select required value={selectedAddressId} onChange={e => setSelectedAddressId(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm bg-white">
                {addressesList.map(a => <option key={a.id} value={a.id}>[{a.address_type}] {a.pic_name} - {a.complete_address}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-700">Rincian Part Items</h3>
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-4 rounded-lg border">
              <div className="flex-1 min-w-[150px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Part Code</label>
                <select required value={item.product_id} onChange={e => handleProductSelect(idx, e.target.value)} className="w-full border p-2 rounded text-sm bg-white font-mono mt-1">
                  <option value="">-- Select --</option>
                  {productsList.map(p => <option key={p.id} value={p.id}>{p.part_code}</option>)}
                </select>
              </div>
              <div className="flex-[2] min-w-[200px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Part Name</label>
                <input type="text" readOnly value={item.part_name} className="w-full border p-2 rounded text-sm bg-gray-200 mt-1" />
              </div>
              <div className="w-20">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-center block">Qty</label>
                <input type="number" min="1" value={item.qty} onChange={e => updateItemField(idx, 'qty', parseInt(e.target.value) || 0)} className="w-full border p-2 rounded text-sm text-center mt-1" />
              </div>
              <div className="w-32">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">Price (Rp)</label>
                <input type="number" value={item.unit_price} onChange={e => updateItemField(idx, 'unit_price', parseInt(e.target.value) || 0)} className="w-full border p-2 rounded text-sm text-right mt-1" />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">Disc (%)</label>
                <input type="number" min="0" max="100" value={item.discount} onChange={e => updateItemField(idx, 'discount', parseFloat(e.target.value) || 0)} className="w-full border p-2 rounded text-sm text-right mt-1 text-red-600 font-bold" />
              </div>
              <div className="flex-[1.5] min-w-[120px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Item Note</label>
                <input type="text" value={item.item_note} onChange={e => updateItemField(idx, 'item_note', e.target.value)} placeholder="Cth: Indent 2 hr" className="w-full border p-2 rounded text-sm mt-1" />
              </div>
              <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="mb-2 text-red-400 hover:text-red-600 p-1">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { product_id: '', part_code: '', part_name: '', unit: '', qty: 1, unit_price: 0, discount: 0, item_note: '' }])} className="text-blue-600 text-xs font-bold">+ ADD ITEM LINE</button>
        </div>

        <div className="pt-6 border-t">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Catatan Dokumen (NOTE)</label>
          <textarea 
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border p-3 rounded-md mt-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex justify-between items-center pt-8 border-t">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Grand Total</p>
            <p className="text-3xl font-black text-blue-700">Rp {grandTotal.toLocaleString('id-ID')}</p>
          </div>
          <button type="submit" disabled={isSaving} className="bg-yellow-500 hover:bg-yellow-600 text-white px-12 py-4 rounded-xl font-bold shadow-lg disabled:bg-yellow-300 transition-all">
            {isSaving ? 'Menyimpan...' : 'SIMPAN REVISI BARU'}
          </button>
        </div>
      </form>
    </div>
  );
}