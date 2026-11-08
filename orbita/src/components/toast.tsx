import { create } from 'zustand';

interface ToastState { items: { id: number; text: string }[]; push: (text: string) => void }
let n = 0;
export const useToast = create<ToastState>((set) => ({
  items: [],
  push: (text) => {
    const id = ++n;
    set((s) => ({ items: [...s.items, { id, text }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 3200);
  },
}));
export const toast = (text: string) => useToast.getState().push(text);

export function Toasts() {
  const items = useToast((s) => s.items);
  return <div className="toast-wrap" aria-live="polite">{items.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>;
}
