'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function BulkInsertProduct() {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        // 1. Membaca file Excel
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0]; // Ambil sheet pertama
        const worksheet = workbook.Sheets[sheetName];
        
        // 2. Ubah Excel ke format JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 3. Mapping data Excel ke kolom database Supabase
        const formattedData = jsonData.map((row: any) => ({
          part_code: row.part_code || row.Part_Code || row.SKU || '',
          part_name: row.part_name || row.Part_Name || row.Nama || '',
          price: Number(row.price || row.Harga || row.Base_Price || 0),
          unit: row.unit || row.Satuan || row.Unit || 'PCS',
          remark: row.remark || row.Remark || row.Keterangan || ''
        })).filter(item => item.part_code !== '' && item.part_name !== '');

        if (formattedData.length === 0) {
          alert('Data Excel kosong atau kolom tidak sesuai (SKU dan Nama wajib ada).');
          setIsLoading(false);
          return;
        }

        // 4. Insert massal ke Supabase
        const { error } = await supabase.from('products').insert(formattedData);

        if (error) {
          // Tangani error jika SKU duplikat
          if (error.code === '23505') {
             throw new Error('Ada SKU yang sudah terdaftar di database. Pastikan SKU unik.');
          }
          throw error;
        }

        alert(`Sukses! ${formattedData.length} produk berhasil ditambahkan.`);
        router.refresh(); // Refresh halaman agar tabel data terbaru langsung muncul
        
        // Reset input file
        if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (err: any) {
        console.error('Error uploading excel:', err);
        alert(`Gagal: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isLoading ? (
          'Memproses...'
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Excel
          </>
        )}
      </button>
    </div>
  );
}