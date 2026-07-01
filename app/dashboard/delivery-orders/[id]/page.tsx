// app/dashboard/delivery-orders/[id]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import DeliveryOrderDetailClient from './DeliveryOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const id = params.id;

  // ── TAHAP 1: deliveryOrder (untuk guard + so_id + address_id) ──
  const { data: deliveryOrder } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!deliveryOrder) notFound();

  // ── TAHAP 2: 4 query mandiri (butuh so_id / address_id / id) → paralel ──
  const [soRes, soItemsRes, shippingRes, itemsRes] = await Promise.all([
    deliveryOrder.so_id
      ? supabase
          .from('sales_orders')
          .select('*')
          .eq('id', deliveryOrder.so_id)
          .single()
      : Promise.resolve({ data: null }),
    deliveryOrder.so_id
      ? supabase
          .from('sales_order_items')
          .select('id, qty')
          .eq('so_id', deliveryOrder.so_id)
      : Promise.resolve({ data: [] as any[] }),
    deliveryOrder.address_id
      ? supabase
          .from('customer_addresses')
          .select('*')
          .eq('id', deliveryOrder.address_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('delivery_order_items')
      .select(
        `
        id, qty_delivered, so_item_id,
        sales_order_items (
          products ( part_code, part_name, unit, remark )
        )
      `
      )
      .eq('do_id', id),
  ]);

  const salesOrder = soRes.data;
  const soItemsOriginal = soItemsRes.data;
  const shippingAddress = shippingRes.data;
  const rawItems = itemsRes.data || [];

  // ── TAHAP 3: customer + billing (butuh salesOrder.customer_id) → paralel ──
  let customer: any = null;
  let billingAddress: any = null;
  if (salesOrder?.customer_id) {
    const [custRes, addrsRes] = await Promise.all([
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

    customer = custRes.data;
    const allAddrs = addrsRes.data;
    if (allAddrs && allAddrs.length > 0) {
      billingAddress =
        allAddrs.find((a: any) => a.address_type?.toLowerCase() === 'billing') ||
        allAddrs[0];
    }
  }

  // ── NORMALISASI items: pastikan sales_order_items & products berupa OBJEK tunggal ──
  // (Supabase kadang mengembalikan relasi embedded sebagai array)
  const items = rawItems.map((item: any) => {
    const so = Array.isArray(item.sales_order_items)
      ? item.sales_order_items[0]
      : item.sales_order_items;

    const prod = so
      ? Array.isArray(so.products)
        ? so.products[0]
        : so.products
      : null;

    return {
      ...item,
      sales_order_items: so ? { ...so, products: prod ?? null } : null,
    };
  });

  // ── Bangun map qty asli SO ──
  const soItemsDataMap: Record<string, number> = {};
  soItemsOriginal?.forEach((item: any) => {
    soItemsDataMap[item.id] = item.qty;
  });

  // ── Deteksi partial delivery (di server) ──
  let isPartialDelivery = false;
  for (const item of items) {
    const originalQty = soItemsDataMap[item.so_item_id] || 0;
    if (item.qty_delivered < originalQty) {
      isPartialDelivery = true;
      break;
    }
  }

  return (
    <DeliveryOrderDetailClient
      deliveryOrder={deliveryOrder}
      salesOrder={salesOrder}
      customer={customer}
      billingAddress={billingAddress}
      shippingAddress={shippingAddress}
      items={items}
      isPartialDelivery={isPartialDelivery}
    />
  );
}