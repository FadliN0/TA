import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ProductClient from './ProductClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('part_code', { ascending: true });

  return <ProductClient initialProducts={products || []} />;
}