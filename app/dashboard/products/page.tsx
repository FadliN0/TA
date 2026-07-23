import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import ProductClient from './ProductClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('part_code', { ascending: true });

  return <ProductClient initialProducts={products || []} />;
}