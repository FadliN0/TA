import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CreateQuotationClient from './CreateQuotationClient';

export const dynamic = 'force-dynamic';

export default async function CreateQuotationPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('part_code');
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('company_name');

  // Generate nomor penawaran berikutnya (QO-HJP-YYYYMM-XXX)
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `QO-HJP-${yearMonth}-`;

  const { data: lastDoc } = await supabase
    .from('quotations')
    .select('quotation_number')
    .like('quotation_number', `${prefix}%`)
    .order('quotation_number', { ascending: false })
    .limit(1);

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
      products={products || []}
      customers={customers || []}
      initialQuotationNumber={initialQuotationNumber}
      initialValidUntil={initialValidUntil}
    />
  );
}