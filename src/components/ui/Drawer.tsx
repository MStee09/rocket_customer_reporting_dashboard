import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  footer?: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  footer,
}: DrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const positions = {
    left: 'left-0',
    right: 'right-0',
  };

  const drawer = (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        className={`
          absolute top-0 ${positions[position]} h-full w-full ${sizes[size]}
          bg-white shadow-xl flex flex-col
          transform transition-transform duration-300
        `}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-auto"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="p-4 border-t bg-gray-50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}
