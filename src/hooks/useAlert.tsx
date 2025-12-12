import { useState, useCallback } from 'react';
import { AlertDialog, type AlertType } from '../components/ui/AlertDialog';

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<(AlertOptions & { isOpen: boolean; onConfirm?: () => void }) | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({
        ...options,
        isOpen: true,
        onConfirm: () => {
          resolve();
        },
      });
    });
  }, []);

  const showConfirm = useCallback((options: AlertOptions) => {
    return new Promise<boolean>((resolve) => {
      const handleCancel = () => {
        setAlertState(null);
        resolve(false);
      };
      
      setAlertState({
        ...options,
        isOpen: true,
        showCancel: true,
        onConfirm: () => {
          setAlertState(null);
          resolve(true);
        },
        onClose: handleCancel,
      } as any);
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(null);
  }, []);

  const AlertComponent = alertState ? (
    <AlertDialog
      isOpen={alertState.isOpen}
      onClose={closeAlert}
      onConfirm={alertState.onConfirm}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      confirmText={alertState.confirmText}
      cancelText={alertState.cancelText}
      showCancel={alertState.showCancel}
    />
  ) : null;

  return {
    showAlert,
    showConfirm,
    AlertComponent,
  };
}
