import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type ToastMessage = string | {
  title: string;
  amount?: string;
  detail?: string;
};

type ToastCtx = { show: (msg: ToastMessage) => void };
const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMessage | null>(null);

  const show = useCallback((m: ToastMessage) => setMsg(m), []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), typeof msg === 'string' ? 2200 : 3600);
    return () => clearTimeout(t);
  }, [msg]);

  const rich = typeof msg === 'object' ? msg : null;
  const plain = typeof msg === 'string' ? msg : null;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className={`toast${msg ? ' show' : ''}${rich ? ' rich' : ''}`}>
        {rich ? (
          <>
            <div className="toast-title">{rich.title}</div>
            {rich.amount && <div className="toast-amount">{rich.amount}</div>}
            {rich.detail && <div className="toast-detail">{rich.detail}</div>}
          </>
        ) : (
          plain
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside ToastProvider');
  return v;
}
