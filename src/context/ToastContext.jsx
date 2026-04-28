import React, { createContext, useCallback, useContext } from 'react';
import Swal from 'sweetalert2';

const ToastContext = createContext(null);

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3400,
  timerProgressBar: true,
});

export function ToastProvider({ children }) {
  const toast = useCallback((message, type = 'success') => {
    let icon = 'success';
    if (type === 'error') icon = 'error';
    else if (type === 'warn' || type === 'warning') icon = 'warning';
    else if (type === 'info') icon = 'info';

    Toast.fire({
      icon,
      title: message,
    });
  }, []);

  return <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
}
