import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import EditQuotationClient from './EditQuotationClient';

export const dynamic = 'force-dynamic';

export default async function EditQuotationPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = createServerComponentClient({ cookies });

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('part_code');
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('company_name');

  const { data: quote } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single();

  if (!quote) notFound();

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', quote.customer_id);

  const { data: itemsData } = await supabase
    .from('quotation_items')
    .select(`*, products(part_code, part_name, unit, price, remark)`)
    .eq('quotation_id', id);

  const initialItems = (itemsData || []).map((i: any) => ({
    product_id: i.product_id,
    part_code: i.products?.part_code ?? '',
    part_name: i.products?.part_name ?? '',
    unit: i.products?.unit ?? '',
    qty: i.qty,
    unit_price: i.unit_price,
    discount: i.discount ?? 0,
    remark: i.products?.remark ?? '',
    _db_price: i.products?.price ?? i.unit_price,
    _db_remark: i.products?.remark ?? '',
  }));

  return (
    <EditQuotationClient
      id={id}
      products={products || []}
      customers={customers || []}
      initialAddresses={addresses || []}
      initialQuotationNumber={quote.quotation_number}
      initialValidUntil={quote.valid_until}
      initialCustomerId={quote.customer_id}
      initialAddressId={quote.address_id}
      initialMrNumber={quote.mr_number || ''}
      initialNotes={quote.notes || ''}
      initialItems={initialItems}
    />
  );
}