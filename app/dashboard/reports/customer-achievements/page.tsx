'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CustomerAchievementPage() {
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any[]>([]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      // 1. Ambil semua customer
      const { data: customers } = await supabase.from('customers').select('id, company_name');
      
      // 2. Ambil target untuk bulan & tahun ini
      const { data: targets } = await supabase.from('customer_targets')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      // 3. Ambil total penjualan riil dari View kita
      // Kita filter berdasarkan bulan dan tahun transaksi
      const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59Z`;

      const { data: sales } = await supabase.from('v_transaction_lifecycle')
        .select('customer_id, total_order_value')
        .gte('so_date', startDate)
        .lte('so_date', endDate);

      // 4. Gabungkan data (Mapping)
      const report = customers?.map(cust => {
        const target = targets?.find(t => t.customer_id === cust.id)?.target_amount || 0;
        const actual = sales?.filter(s => s.customer_id === cust.id)
          .reduce((sum, item) => sum + Number(item.total_order_value), 0) || 0;
        const percent = target > 0 ? (actual / target) * 100 : 0;

        return {
          id: cust.id,
          name: cust.company_name,
          target,
          actual,
          percent
        };
      }) || [];

      setData(report);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAchievements(); }, [month, year]);

  const exportToCSV = () => {
    const headers = ['Nama Customer', 'Target', 'Realisasi', 'Persentase (%)'];
    const rows = data.map(item => [
      `"${item.name}"`, 
      item.target, 
      item.actual, 
      item.percent.toFixed(2)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Achievement_Customer_${month}_${year}.csv`;
    link.click();
  };

  const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Achievement Per Customer</h1>
          <p className="text-sm text-gray-500">Pantau pencapaian target penjualan tiap klien.</p>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border p-2 rounded-lg text-sm font-bold">
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Bulan {i+1}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border p-2 rounded-lg text-sm font-bold w-24" />
          <button onClick={exportToCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold">📥 Export CSV</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 font-bold text-gray-600">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Target Nominal</th>
              <th className="p-4">Realisasi (Aktual)</th>
              <th className="p-4 w-64">Achievement %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-800">{item.name}</td>
                <td className="p-4 text-blue-600 font-semibold">{fmtRp(item.target)}</td>
                <td className="p-4 text-gray-700 font-semibold">{fmtRp(item.actual)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-black text-xs min-w-[40px]">{item.percent.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}