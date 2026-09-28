'use client';

import * as React from 'react';
import type { ToastActionElement, ToastProps } from './toast';

/* ── Types ────────────────────────────────────────────────────────── */

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY_MS = 4000;

type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: ToastVariant;
};

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

let count = 0;
function generateId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

/* ── Reducer ──────────────────────────────────────────────────────── */

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function addToRemoveQueue(toastId: string, dispatch: React.Dispatch<Action>) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY_MS);
  toastTimeouts.set(toastId, timeout);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'DISMISS_TOAST': {
      const { toastId } = action;
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    }

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

/* ── Context ──────────────────────────────────────────────────────── */

const ToastContext = React.createContext<{
  toasts: ToasterToast[];
  toast: (props: Omit<ToasterToast, 'id'>) => void;
  dismiss: (toastId?: string) => void;
} | null>(null);

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] });

  const toast = React.useCallback((props: Omit<ToasterToast, 'id'>) => {
    const id = generateId();
    dispatch({ type: 'ADD_TOAST', toast: { ...props, id, open: true } });
    // Auto-dismiss after delay
    addToRemoveQueue(id, dispatch);
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: 'DISMISS_TOAST', toastId });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

/* ── Hook ─────────────────────────────────────────────────────────── */

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastContextProvider');

  return {
    toasts: ctx.toasts,
    toast: ctx.toast,
    dismiss: ctx.dismiss,
    // Convenience shortcuts
    success: (title: string, description?: string) =>
      ctx.toast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      ctx.toast({ title, description, variant: 'destructive' }),
    warning: (title: string, description?: string) =>
      ctx.toast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      ctx.toast({ title, description, variant: 'info' }),
  };
}
