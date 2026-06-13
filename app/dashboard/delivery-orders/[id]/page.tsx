// app/dashboard/delivery-orders/[id]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import DeliveryOrderDetailClient from './DeliveryOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const id = params.id;

  const { data: deliveryOrder } = await supabase.from('delivery_orders').select('*').eq('id', id).single();
  if (!deliveryOrder) notFound();

  let salesOrder: any = null;
  let customer: any = null;
  let billingAddress: any = null;
  let shippingAddress: any = null;
  const soItemsDataMap: Record<string, number> = {};

  if (deliveryOrder.so_id) {
    const { data: soData } = await supabase.from('sales_orders').select('*').eq('id', deliveryOrder.so_id).single();
    salesOrder = soData;

    if (soData?.customer_id) {
      const { data: custData } = await supabase.from('customers').select('*').eq('id', soData.customer_id).single();
      customer = custData;

      const { data: allAddrs } = await supabase.from('customer_addresses').select('*').eq('customer_id', soData.customer_id);
      if (allAddrs && allAddrs.length > 0) {
        billingAddress = allAddrs.find((a: any) => a.address_type?.toLowerCase() === 'billing') || allAddrs[0];
      }
    }

    const { data: soItemsOriginal } = await supabase.from('sales_order_items').select('id, qty').eq('so_id', deliveryOrder.so_id);
    soItemsOriginal?.forEach((item: any) => { soItemsDataMap[item.id] = item.qty; });
  }

  if (deliveryOrder.address_id) {
    const { data: addrData } = await supabase.from('customer_addresses').select('*').eq('id', deliveryOrder.address_id).single();
    shippingAddress = addrData;
  }

  const { data: items } = await supabase
    .from('delivery_order_items')
    .select(`
      id, qty_delivered, so_item_id,
      sales_order_items (
        products ( part_code, part_name, unit, remark )
      )
    `)
    .eq('do_id', id);

  // ── ALGORITMA DETEKSI PARTIAL (di server) ──
  let isPartialDelivery = false;
  for (const item of items || []) {
    const originalQty = soItemsDataMap[item.so_item_id] || 0;
    if (item.qty_delivered < originalQty) { isPartialDelivery = true; break; }
  }

  return (
    <DeliveryOrderDetailClient
      deliveryOrder={deliveryOrder}
      salesOrder={salesOrder}
      customer={customer}
      billingAddress={billingAddress}
      shippingAddress={shippingAddress}
      items={items || []}
      isPartialDelivery={isPartialDelivery}
    />
  );
}