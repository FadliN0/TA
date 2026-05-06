'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal'; // <-- Panggil Wadah Modal Modern Kita

export default function SmartPasteProduct() {
  const [isOpen, setIsOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Fungsi Ajaib Pemecah Teks
  const handleParse = () => {
    const rows = pastedText.split('\n').filter(row => row.trim() !== '');
    
    const data = rows.map((row) => {
      let cols = row.split('\t'); 
      if (cols.length < 2) cols = row.split('|'); 
      if (cols.length < 2) cols = row.split(';'); 
      if (cols.length < 2) cols = row.split(','); 

      return {
        part_code: cols[0]?.trim() || '',
        part_name: cols[1]?.trim() || '',
        price: Number(cols[2]?.replace(/[^0-9]/g, '')) || 0, 
        unit: cols[3]?.trim() || 'PCS',
        remark: cols[4]?.trim() || ''
      };
    }).filter(item => item.part_code !== '' && item.part_name !== ''); 

    setParsedData(data);
  };

  const handleSaveToDatabase = async () => {
    if (parsedData.length === 0) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.from('products').insert(parsedData);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Gagal: Ada Part Code yang sudah terdaftar di database (Duplikat).');
        }
        throw error;
      }

      alert(`Mantap! ${parsedData.length} produk berhasil ditambahkan.`);
      setIsOpen(false);
      setPastedText('');
      setParsedData([]);
      router.refresh();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const fmtRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  return (
    <>
      {/* TOMBOL PEMICU (Gaya khusus warna Emerald) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-emerald-200 transition-all focus:ring-4 focus:ring-emerald-500/20 active:scale-95 w-full md:w-auto"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        Smart Paste
      </button>

      {/* MODAL COMPONENT */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="⚡ Smart Paste dari Excel"
        footer={
          <>
            <button onClick={() => setIsOpen(false)} className="btn-secondary">Batal</button>
            <button 
              onClick={handleSaveToDatabase}
              disabled={parsedData.length === 0 || isSaving} 
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-emerald-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSaving ? 'Menyimpan...' : `Simpan ${parsedData.length} Produk`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          
          {/* Petunjuk Penggunaan */}
          <div className="bg-slate-100 text-slate-700 p-4 rounded-xl text-sm border border-slate-200 leading-relaxed">
            <strong>Aturan Paste:</strong> Bisa Copy dari Excel, Notepad, atau WhatsApp. <br/>
            Urutan wajib: <span className="font-mono font-bold text-slate-900 bg-white px-1 py-0.5 rounded border">Part Code - Nama Part - Harga - Satuan - Keterangan</span>.<br/>
            Note: <span className="font-mono font-bold text-slate-900 bg-white px-1 py-0.5 rounded border">Pisahkan Dengan Demiliter " , " " . " " / " " | " " ; " </span>.<br/>
          </div>

          {/* Area Textarea */}
          <div>
            <label className="label-modern">Paste Data Di Sini</label>
            <textarea 
              className="input-modern h-32 font-mono whitespace-pre"
              placeholder="Paste (Ctrl+V) tabel dari Excel ke sini..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
          </div>

          <button 
            onClick={handleParse}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            ↓ Pratinjau Data (Preview)
          </button>

          {/* Tabel Preview (Hanya muncul jika ada data) */}
          {parsedData.length > 0 && (
            <div className="card-modern overflow-x-auto custom-scrollbar mt-2">
              <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Part Code</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Nama Part</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Harga</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">Satuan</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-emerald-600">{item.part_code}</td>
                      <td className="p-3 font-bold text-slate-800">{item.part_name}</td>
                      <td className="p-3 text-right font-black text-slate-800">{fmtRp(item.price)}</td>
                      <td className="p-3 text-center text-slate-600">{item.unit}</td>
                      <td className="p-3 text-slate-500">{item.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </Modal>
    </>
  );
}