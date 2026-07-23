import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import CreateQuotationClient from './CreateQuotationClient';

export const dynamic = 'force-dynamic';

export default async function CreateQuotationPage() {
  const supabase = await createClient();

  // Perhitungan sinkron (tanpa await) → siapkan dulu
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `QO-HJP-${yearMonth}-`;

  // 3 query mandiri → jalankan bersamaan
  const [productsRes, customersRes, lastDocRes] = await Promise.all([
    supabase.from('products').select('*').order('part_code'),
    supabase.from('customers').select('*').order('company_name'),
    supabase
      .from('quotations')
      .select('quotation_number')
      .like('quotation_number', `${prefix}%`)
      .order('quotation_number', { ascending: false })
      .limit(1),
  ]);

  const products = productsRes.data || [];
  const customers = customersRes.data || [];
  const lastDoc = lastDocRes.data;

  // Perhitungan ini BUTUH lastDoc → harus setelah Promise.all
  let nextSeq = 1;
  if (lastDoc && lastDoc.length > 0) {
    const remainder = lastDoc[0].quotation_number.replace(prefix, '');
    const seqString = remainder.split('-')[0];
    const parsedSeq = parseInt(seqString, 10);
    if (!isNaN(parsedSeq)) nextSeq = parsedSeq + 1;
  }
  const initialQuotationNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

  const vDate = new Date();
  vDate.setDate(vDate.getDate() + 14);
  const initialValidUntil = vDate.toISOString().split('T')[0];

  return (
    <CreateQuotationClient
      products={products}
      customers={customers}
      initialQuotationNumber={initialQuotationNumber}
      initialValidUntil={initialValidUntil}
    />
  );
}