import { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

export type AlertType = 'warning' | 'info' | 'success' | 'danger';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = true,
}: AlertDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12" />,
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600',
        };
      case 'danger':
        return {
          icon: <XCircle className="w-12 h-12" />,
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12" />,
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-600 dark:text-green-400',
          buttonBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
        };
      default:
        return {
          icon: <Info className="w-12 h-12" />,
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          buttonBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
        };
    }
  };

  const { icon, iconBg, iconColor, buttonBg } = getIconAndColors();

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all hover:rotate-90 duration-300"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`${iconBg} ${iconColor} p-3 rounded-full`}>
              {icon}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white ${buttonBg} rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
