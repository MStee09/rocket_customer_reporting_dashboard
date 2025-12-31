import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, Plus } from 'lucide-react';

interface RecentRecipientsDropdownProps {
  recentRecipients: string[];
  currentRecipients: string[];
  onAddRecipient: (email: string) => void;
}

export function RecentRecipientsDropdown({
  recentRecipients,
  currentRecipients,
  onAddRecipient
}: RecentRecipientsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableRecipients = recentRecipients.filter(
    email => !currentRecipients.map(e => e.toLowerCase()).includes(email.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (availableRecipients.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        type="button"
      >
        <Clock className="w-3 h-3" />
        Recent
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          <p className="px-3 py-1.5 text-xs text-slate-400 font-medium border-b border-slate-100">
            Recently used
          </p>
          {availableRecipients.map(email => (
            <button
              key={email}
              onClick={() => {
                onAddRecipient(email);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              type="button"
            >
              <span className="truncate">{email}</span>
              <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
