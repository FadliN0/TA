import { cookies } from 'next/headers';
import DashboardClient from './Dashboard';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic'; // Selalu ambil data terbaru

export default async function DashboardHome() {
  const supabase = await createClient();
  
  // 1. Ambil Nama User
  const { data: { session } } = await supabase.auth.getSession();
  const userName = session?.user?.email?.split('@')[0] || 'Admin';

  // 2. Persiapan Waktu (6 Bulan Terakhir)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1).toISOString();

  // 3. Tarik Data dari Database (Hanya 1 Kueri Instan)
  const { data: allTrx, error } = await supabase
    .from('v_transaction_lifecycle')
    .select('*')
    .or(`so_date.gte.${sixMonthsAgo},payment_status.neq.Paid,delivery_status.neq.Completed`) 
    .order('so_date', { ascending: false });

  if (error) console.error('Error fetching dashboard data:', error);
  const data = allTrx || [];

  // 4. OFFLOADING COMPUTATION KE SERVER NODE.JS (Browser Pengguna Bebas Beban)
  let omset = 0;
  let piutang = 0;
  let pesanan = 0;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const chartMap = new Map();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    chartMap.set(`${d.getFullYear()}-${d.getMonth()}`, {
      bulan: monthNames[d.getMonth()],
      total: 0
    });
  }

  data.forEach(trx => {
    const paid = Number(trx.total_paid_amount) || 0;
    const invTotal = Number(trx.invoice_total) || 0;

    if (trx.invoice_date && trx.invoice_status !== 'Uninvoiced') {
      const invDate = new Date(trx.invoice_date);
      
      // Omset Bulan Ini
      if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
        omset += invTotal;
      }

      // Masukkan ke Grafik
      const key = `${invDate.getFullYear()}-${invDate.getMonth()}`;
      if (chartMap.has(key)) {
        const current = chartMap.get(key);
        chartMap.set(key, { ...current, total: current.total + invTotal });
      }

      // Hitung Piutang
      if (invTotal > paid) {
        piutang += (invTotal - paid);
      }
    }  
    
    // Hitung Pesanan Aktif
    if (trx.delivery_status !== 'Completed') {
      pesanan += 1;
    }
  });

  const kpi = { omsetBulanIni: omset, piutangBeredar: piutang, pesananAktif: pesanan };
  const recentTrx = data.slice(0, 5);
  const chartData = Array.from(chartMap.values());

  // 5. Kirim Data Matang ke Antarmuka (Client)
  return (
    <DashboardClient 
      userName={userName} 
      kpi={kpi} 
      recentTrx={recentTrx} 
      chartData={chartData} 
    />
  );
}