import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AddProductClient from './AddProductClient';

export const dynamic = 'force-dynamic';

export default async function AddProductPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data } = await supabase.from('products').select('part_code');

  const existingCodes = (data || []).map((p: any) =>
    p.part_code.toUpperCase().trim(),
  );

  return <AddProductClient existingCodes={existingCodes} />;
}