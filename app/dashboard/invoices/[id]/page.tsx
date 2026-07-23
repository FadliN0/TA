import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import InvoiceDetailClient from './InvoiceDetailClient';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { id } = params;

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (!invoice) notFound();

  const [{ data: paymentsHistory }, soResult] = await Promise.all([
    supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true }),
    invoice.so_id
      ? supabase
          .from('sales_orders')
          .select('*')
          .eq('id', invoice.so_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const salesOrder = soResult?.data ?? null;

  let customer = null;
  let billingAddress = null;
  if (salesOrder?.customer_id) {
    const [{ data: custData }, { data: allAddrs }] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('id', salesOrder.customer_id)
        .single(),
      supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', salesOrder.customer_id),
    ]);
    customer = custData ?? null;
    if (allAddrs && allAddrs.length > 0) {
      billingAddress =
        allAddrs.find(
          (a: any) => a.address_type?.toLowerCase() === 'billing',
        ) || allAddrs[0];
    }
  }

  const [{ data: soItemsData }, { data: invItemsData }] = await Promise.all([
    supabase
      .from('sales_order_items')
      .select(
        'id, qty, unit_price, total_price, products ( part_code, part_name, unit, remark )',
      )
      .eq('so_id', invoice.so_id),
    supabase
      .from('invoice_items')
      .select('id, so_item_id, qty_billed, item_note')
      .eq('invoice_id', id),
  ]);

  const items = (soItemsData || []).map((soItem: any) => {
    const matchedInvItem = invItemsData?.find(
      (invItem: any) => invItem.so_item_id === soItem.id,
    );
    return {
      ...soItem,
      invoice_item_id: matchedInvItem?.id,
      qty_billed: matchedInvItem?.qty_billed || soItem.qty,
      item_note: matchedInvItem?.item_note || '',
    };
  });

  return (
    <InvoiceDetailClient
      invoice={invoice}
      salesOrder={salesOrder}
      customer={customer}
      billingAddress={billingAddress}
      items={items}
      paymentsHistory={paymentsHistory || []}
    />
  );
}