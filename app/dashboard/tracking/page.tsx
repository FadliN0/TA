'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TrackingPage() {
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTrackingData();
  }, []);

  const fetchTrackingData = async () => {
    setLoading(true); 
    try {
      const { data, error } = await supabase
        .from('view_document_tracking')
        .select('*')
        .order('so_date', { ascending: false });

      if (error) throw error;

      if (data) {
        console.log("Data berhasil ditarik:", data); 
        setTrackingData(data); 
      }
    } catch (error: any) {
      console.error("Gagal menarik data tracking:", error.message);
      alert("Gagal memuat data tracking.");
    } finally {
      setLoading(false); 
    }
  };

  const filteredData = trackingData.filter(trx => 
    trx.so_number?.toLowerCase().includes(search.toLowerCase()) ||
    trx.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Komponen Stepper untuk Visualisasi Timeline
  const TrackingStepper = ({ trx }: { trx: any }) => {
    
    const isQODone = !!trx.quotation_number; 
    const isSODone = !!trx.so_number;
    const isDODone = trx.do_status === 'Completed' || trx.do_status === 'Delivered';
    
    // [TAMBAHAN CANCEL INVOICE] Deteksi status lunas & status batal
    const isInvoiceDone = trx.invoice_status === 'Paid';
    const isInvoiceCancelled = trx.invoice_status?.toLowerCase().includes('cancel');

    const steps = [
      { 
        title: 'Penawaran (QO)', 
        desc: trx.quotation_number || 'Tidak Ada', 
        state: isQODone ? 'done' : 'pending',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      },
      { 
        title: 'Pesanan (SO)', 
        desc: trx.so_number || 'Menunggu', 
        state: isSODone ? 'done' : 'pending',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      },
      { 
        title: 'Surat Jalan (DO)', 
        desc: trx.do_status || 'Pending', 
        state: isDODone ? 'done' : 'pending',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      },
      { 
        title: 'Tagihan (INV)', 
        desc: trx.invoice_status || 'Unpaid', 
        // [TAMBAHAN CANCEL INVOICE] Masukkan state 'cancelled'
        state: isInvoiceCancelled ? 'cancelled' : isInvoiceDone ? 'done' : 'pending',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      }
    ];

    return (
      <div className="flex items-center w-full mt-4">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 flex relative">
            {/* Garis Penghubung */}
            {index !== steps.length - 1 && (
              <div className={`absolute top-5 left-1/2 w-full h-1 -z-10 ${step.state === 'done' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
            )}
            
            <div className="flex flex-col items-center w-full relative z-10">
              {/* Lingkaran Icon dengan 3 Warna: Emerald (Done), Rose (Cancel), Gray (Pending) */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                step.state === 'done' ? 'bg-emerald-500 text-white' : 
                step.state === 'cancelled' ? 'bg-rose-500 text-white' : 
                'bg-slate-200 text-slate-400'
              }`}>
                {step.state === 'cancelled' ? (
                   // Icon Silang (X) jika batal
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{step.icon}</svg>
                )}
              </div>
              
              {/* Teks Status */}
              <div className="text-center mt-2">
                <p className={`text-xs font-bold ${
                  step.state === 'done' ? 'text-slate-800' : 
                  step.state === 'cancelled' ? 'text-rose-700' : 
                  'text-slate-400'
                }`}>{step.title}</p>

                <p className={`text-[10px] uppercase font-bold mt-1 px-2 py-0.5 rounded-full inline-block border ${
                  step.state === 'done' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                  step.state === 'cancelled' ? 'bg-rose-100 text-rose-700 border-rose-300' : 
                  'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {step.state === 'cancelled' ? '🚫 Dibatalkan' : step.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Tracking Dokumen Operasional</h1>
          <p className="text-sm text-slate-500">Lacak siklus hidup transaksi dari Penawaran hingga Pembayaran.</p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full md:w-72 relative">
          <input 
            type="text" 
            placeholder="Cari No. SO atau Nama Pelanggan..." 
            className="w-full border-2 border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500/20 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Melacak sinyal dokumen...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-white rounded-xl border-dashed border-2 border-slate-200">
            Dokumen tidak ditemukan.
          </div>
        ) : (
          filteredData.map((trx, idx) => {
            // [TAMBAHAN CANCEL INVOICE]
            const isCancelled = trx.invoice_status?.toLowerCase().includes('cancel');

            return (
              <div key={idx} className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border ${isCancelled ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100 hover:shadow-md'} transition-shadow`}>
                
                {/* [TAMBAHAN CANCEL INVOICE] Watermark Latar Belakang */}
                {isCancelled && (
                  <div className="absolute right-4 md:right-20 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none transform -rotate-12 select-none">
                    <span className="text-7xl md:text-9xl font-black text-rose-600">CANCELED</span>
                  </div>
                )}

                {/* Header Card Transaction */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4 relative z-10">
                  <div>
                    <h3 className={`text-lg font-black ${isCancelled ? 'text-slate-500' : 'text-blue-700'}`}>{trx.company_name}</h3>
                    <p className="text-sm font-mono text-slate-500 mt-1">SO Ref: {trx.so_number} • {new Date(trx.so_date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Nilai</p>
                    {/* [TAMBAHAN CANCEL INVOICE] Coret Harga */}
                    <p className={`text-lg font-black ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      Rp {Number(trx.total_order_value || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Panggil Komponen Stepper */}
                <TrackingStepper trx={trx} />
                
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}