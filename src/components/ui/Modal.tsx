import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

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
    full: 'max-w-4xl',
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        ref={modalRef}
        className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-auto"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {footer && (
          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
