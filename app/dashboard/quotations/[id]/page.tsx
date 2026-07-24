import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import QuotationDetailClient from './QuotationDetailClient';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quotation } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single();

  if (!quotation) notFound();

  // Cek apakah Quotation ini sudah punya Sales Order
  const [soRes, customerRes, addressRes, itemsRes] = await Promise.all([
    supabase
      .from('sales_orders')
      .select('id, so_number')
      .eq('quotation_id', id)
      .maybeSingle(),
    quotation.customer_id
      ? supabase
        .from('customers')
        .select('*')
        .eq('id', quotation.customer_id)
        .single()
      : Promise.resolve({ data: null }),
    quotation.address_id
      ? supabase
        .from('customer_addresses')
        .select('*')
        .eq('id', quotation.address_id)
        .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('quotation_items')
      .select('*, products(*)')
      .eq('quotation_id', id),
  ]);
  
  const existingSO = soRes.data;
  const customer = customerRes.data;
  const address = addressRes.data;
  const items = itemsRes.data || [];

  return (
    <QuotationDetailClient
      id={id}
      initialQuotation={quotation}
      customer={customer}
      address={address}
      items={items}
      initialExistingSO={existingSO}
    />
  );
}