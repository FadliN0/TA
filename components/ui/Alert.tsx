'use client';

import React, {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

const STYLES: Record<AlertVariant, {
  bg: string; border: string; iconBg: string; icon: string;
  titleColor: string; msgColor: string;
}> = {
  success: {
    bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7',
    icon: '✓', titleColor: '#166534', msgColor: '#15803d',
  },
  error: {
    bg: '#fef2f2', border: '#fecaca', iconBg: '#fee2e2',
    icon: '!', titleColor: '#991b1b', msgColor: '#b91c1c',
  },
  warning: {
    bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7',
    icon: '!', titleColor: '#92400e', msgColor: '#b45309',
  },
  info: {
    bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe',
    icon: 'i', titleColor: '#1e40af', msgColor: '#2563eb',
  },
};

// ─── INLINE ALERT BANNER (controlled, untuk form/halaman) ────────────────────
export interface AlertBannerProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
}

export function AlertBanner({ variant, title, message, onClose }: AlertBannerProps) {
  const s = STYLES[variant];
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: '12px 16px', marginBottom: 12,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: s.iconBg, color: s.titleColor,
        fontSize: 10, fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontSize: 12, fontWeight: 700, color: s.titleColor, marginBottom: 2 }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 12, color: s.msgColor, lineHeight: 1.5 }}>{message}</div>
      </div>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: s.titleColor, fontSize: 18, lineHeight: 1,
          padding: 0, opacity: 0.55, flexShrink: 0,
        }}>×</button>
      )}
    </div>
  );
}

// ─── TOAST SYSTEM ────────────────────────────────────────────────────────────
interface ToastItem {
  id: string;
  variant: AlertVariant;
  title?: string;
  message: string;
}

interface ToastCtx {
  success: (message: string, title?: string) => void;
  error:   (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info:    (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

function SingleToast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const s = STYLES[item.variant];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      pointerEvents: 'all',
      minWidth: 280,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: s.iconBg, color: s.titleColor,
        fontSize: 11, fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        {item.title && (
          <div style={{ fontSize: 12, fontWeight: 700, color: s.titleColor, marginBottom: 2 }}>
            {item.title}
          </div>
        )}
        <div style={{ fontSize: 13, color: s.msgColor, fontWeight: 500 }}>{item.message}</div>
      </div>
      <button onClick={() => onDismiss(item.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: s.titleColor, fontSize: 18, lineHeight: 1,
        padding: 0, opacity: 0.45, flexShrink: 0,
      }}>×</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((
    variant: AlertVariant, message: string, title?: string, duration = 4000
  ) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, variant, message, title }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value: ToastCtx = {
    success: (m, t) => push('success', m, t),
    error:   (m, t) => push('error',   m, t, 6000),
    warning: (m, t) => push('warning', m, t, 5000),
    info:    (m, t) => push('info',    m, t),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container — pojok kanan bawah */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 380, width: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}>
        {toasts.map(item => (
          <SingleToast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx;
}