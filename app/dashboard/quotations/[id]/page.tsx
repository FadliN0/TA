import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import QuotationDetailClient from './QuotationDetailClient';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = createServerComponentClient({ cookies });

  const { data: quotation } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single();

  if (!quotation) notFound();

  // Cek apakah Quotation ini sudah punya Sales Order
  const { data: existingSO } = await supabase
    .from('sales_orders')
    .select('id, so_number')
    .eq('quotation_id', id)
    .maybeSingle();

  let customer = null;
  if (quotation.customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', quotation.customer_id)
      .single();
    customer = data;
  }

  let address = null;
  if (quotation.address_id) {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', quotation.address_id)
      .single();
    address = data;
  }

  const { data: items } = await supabase
    .from('quotation_items')
    .select(`*, products ( part_code, part_name, unit, remark )`)
    .eq('quotation_id', id);

  return (
    <QuotationDetailClient
      id={id}
      initialQuotation={quotation}
      customer={customer}
      address={address}
      items={items || []}
      initialExistingSO={existingSO}
    />
  );
}