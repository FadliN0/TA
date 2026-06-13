// app/dashboard/delivery-orders/create/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CreateDOClient from './CreateDOClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryOrderCreatePage({
  searchParams,
}: {
  searchParams: { so_id?: string };
}) {
  const so_id = searchParams.so_id;
  if (!so_id) redirect('/dashboard/sales-orders');

  const supabase = createServerComponentClient({ cookies });

  // 1. Data SO
  const { data: salesOrder } = await supabase
    .from('sales_orders')
    .select('*, customers(company_name)')
    .eq('id', so_id)
    .single();

  // 2. Semua alamat customer (alamat utama di atas)
  let availableAddresses: any[] = [];
  if (salesOrder?.customer_id) {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', salesOrder.customer_id)
      .order('is_default', { ascending: false });
    availableAddresses = data || [];
  }

  // 3. Sisa backorder (read RPC). Jika sudah habis, balik ke SO.
  const { data: backorders } = await supabase.rpc('get_remaining_backorder', { p_so_id: so_id });
  if (!backorders || backorders.length === 0) redirect(`/dashboard/sales-orders/${so_id}`);

  const soItemIds = backorders.map((b: any) => b.so_item_id);
  const { data: itemDetails } = await supabase
    .from('sales_order_items')
    .select('id, products(part_code, part_name, unit)')
    .in('id', soItemIds);

  const initialItems = backorders.map((bo: any) => {
    const detail = itemDetails?.find((i) => i.id === bo.so_item_id);
    const productInfo = Array.isArray(detail?.products) ? detail?.products[0] : detail?.products;
    return {
      ...bo,
      part_code: productInfo?.part_code || '-',
      part_name: productInfo?.part_name || 'Unknown Part',
      unit: productInfo?.unit || 'PCS',
      qty_to_deliver: bo.remaining_qty,
    };
  });

  // Pre-select alamat: pakai address_id dari SO jika ada, kalau tidak pakai default/first
  let preselectedAddressId = '';
  if (availableAddresses.length > 0) {
    if (salesOrder?.address_id && availableAddresses.find((a) => a.id === salesOrder.address_id)) {
      preselectedAddressId = salesOrder.address_id;
    } else {
      preselectedAddressId = (availableAddresses.find((a) => a.is_default) || availableAddresses[0]).id;
    }
  }

  return (
    <CreateDOClient
      soId={so_id}
      salesOrder={salesOrder}
      availableAddresses={availableAddresses}
      initialItems={initialItems}
      preselectedAddressId={preselectedAddressId}
    />
  );
}