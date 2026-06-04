'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ChartDataItem {
  bulan: string;
  total: number;
}

interface Props {
  data: ChartDataItem[];
}

const fmtRp = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`;
const fmtRpShort = (num: number) => {
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)}jt`;
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return `Rp ${num}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
        <p className="font-bold text-slate-500 mb-1">{label}</p>
        <p className="font-black text-blue-600 text-base">{fmtRp(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function SalesTrendChart({ data }: Props) {
  const maxVal = Math.max(...data.map(d => d.total), 0);
  const totalVal = data.reduce((a, b) => a + b.total, 0);
  const avgVal = Math.round(totalVal / (data.length || 1));

  return (
    <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold text-slate-800">Tren Penjualan</h3>
          <p className="text-xs text-slate-400 mt-0.5">6 Bulan Terakhir</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-5 h-0.5 bg-blue-500 rounded inline-block"></span>
          Total Invoice
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="bulan"
            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtRpShort}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#gradBlue)"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              return payload.total > 0
                ? <circle key={`dot-${cx}`} cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
                : <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1} />;
            }}
            activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-between pt-4 border-t border-gray-100">
        {[
          { label: 'Tertinggi', value: fmtRp(maxVal), color: 'text-blue-600' },
          { label: 'Rata-rata/Bulan', value: fmtRp(avgVal), color: 'text-slate-700' },
          { label: 'Total 6 Bulan', value: fmtRp(totalVal), color: 'text-slate-700' },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">{item.label}</p>
            <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}