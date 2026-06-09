import { createServerClient } from '@/lib/supabaseServer';

export async function fetchProducts() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('part_code');
  if (error) throw error;
  return data;
}

export async function fetchProductById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}   