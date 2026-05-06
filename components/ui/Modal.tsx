import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode; 
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Background Blur (Glassmorphism) - Klik di luar modal akan menutupnya */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity cursor-pointer" 
        onClick={onClose}
      ></div>

      {/* Kotak Modal: Mobile (Bottom Sheet) & Desktop (Tengah) */}
      <div className="relative w-full md:max-w-xl bg-white md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-4 fade-in duration-300">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {title}
          </h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Isi Form / Konten */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
          {children}
        </div>

        {/* Footer Modal (Opsional) */}
        {footer && (
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}