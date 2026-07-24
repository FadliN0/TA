import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import SalesOrderDetailClient from './SalesOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: salesOrder } = await supabase
    .from('sales_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!salesOrder) notFound();

  // Ambil data pendukung secara paralel
  const [customerRes, addressRes, itemsRes, doRes, invRes] = await Promise.all([
    salesOrder.customer_id
      ? supabase.from('customers').select('*').eq('id', salesOrder.customer_id).single()
      : Promise.resolve({ data: null }),
    salesOrder.address_id
      ? supabase.from('customer_addresses').select('*').eq('id', salesOrder.address_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('sales_order_items')
      .select(`*, products ( part_code, part_name, unit, remark )`)
      .eq('so_id', id),
    supabase.from('delivery_orders').select('id', { count: 'exact', head: true }).eq('so_id', id),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('so_id', id),
  ]);

  return (
    <SalesOrderDetailClient
      salesOrder={salesOrder}
      customer={customerRes.data}
      address={addressRes.data}
      items={itemsRes.data || []}
      hasDO={(doRes.count || 0) > 0}
      hasInvoice={(invRes.count || 0) > 0}
    />
  );
}