// app/dashboard/delivery-orders/create/page.tsx
import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CreateDOClient from './CreateDOClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryOrderCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ so_id?: string }>;
}) {
  const { so_id } = await searchParams;
  if (!so_id) redirect('/dashboard/sales-orders');

  const supabase = await createClient();

  // === TAHAP 1: salesOrder + backorders (keduanya hanya butuh so_id) ===
  const [salesOrderRes, backordersRes] = await Promise.all([
    supabase
      .from('sales_orders')
      .select('*, customers(company_name)')
      .eq('id', so_id)
      .single(),
    supabase.rpc('get_remaining_backorder', { p_so_id: so_id }),
  ]);

  const salesOrder = salesOrderRes.data;
  const backorders = backordersRes.data;

  // Jika backorder habis, kembali ke SO
  if (!backorders || backorders.length === 0) {
    redirect(`/dashboard/sales-orders/${so_id}`);
  }

  const soItemIds = backorders.map((b: any) => b.so_item_id);

  // === TAHAP 2: alamat (butuh salesOrder) + detail item (butuh backorders) ===
  // Keduanya saling mandiri → paralel
  const [addressesRes, itemDetailsRes] = await Promise.all([
    salesOrder?.customer_id
      ? supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', salesOrder.customer_id)
          .order('is_default', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('sales_order_items')
      .select('id, products(part_code, part_name, unit)')
      .in('id', soItemIds),
  ]);

  const availableAddresses = addressesRes.data || [];
  const itemDetails = itemDetailsRes.data;

  // === Sisanya SAMA seperti kodemu ===
  const initialItems = backorders.map((bo: any) => {
    const detail = itemDetails?.find((i) => i.id === bo.so_item_id);
    const productInfo = Array.isArray(detail?.products)
      ? detail?.products[0]
      : detail?.products;
    return {
      ...bo,
      part_code: productInfo?.part_code || '-',
      part_name: productInfo?.part_name || 'Unknown Part',
      unit: productInfo?.unit || 'PCS',
      qty_to_deliver: bo.remaining_qty,
    };
  });

  let preselectedAddressId = '';
  if (availableAddresses.length > 0) {
    if (
      salesOrder?.address_id &&
      availableAddresses.find((a) => a.id === salesOrder.address_id)
    ) {
      preselectedAddressId = salesOrder.address_id;
    } else {
      preselectedAddressId = (
        availableAddresses.find((a) => a.is_default) || availableAddresses[0]
      ).id;
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