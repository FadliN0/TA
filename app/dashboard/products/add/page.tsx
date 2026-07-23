import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import AddProductClient from './AddProductClient';

export const dynamic = 'force-dynamic';

export default async function AddProductPage() {
  const supabase = await createClient();

  const { data } = await supabase.from('products').select('part_code');

  const existingCodes = (data || []).map((p: any) =>
    p.part_code.toUpperCase().trim(),
  );

  return <AddProductClient existingCodes={existingCodes} />;
}