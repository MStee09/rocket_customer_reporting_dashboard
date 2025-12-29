import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
}: TabsProps) {
  const [active, setActive] = useState(activeTab || tabs[0]?.id);

  const handleChange = (tabId: string) => {
    setActive(tabId);
    onChange(tabId);
  };

  const currentTab = activeTab || active;

  const baseStyles = 'flex items-center gap-2 font-medium transition-colors';

  const variants = {
    default: {
      container: 'border-b border-gray-200',
      tab: (isActive: boolean) => `
        ${baseStyles} px-4 py-2 border-b-2 -mb-px
        ${isActive
          ? 'border-rocket-600 text-rocket-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `,
    },
    pills: {
      container: 'bg-gray-100 p-1 rounded-lg',
      tab: (isActive: boolean) => `
        ${baseStyles} px-4 py-2 rounded-md
        ${isActive
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
        }
      `,
    },
    underline: {
      container: '',
      tab: (isActive: boolean) => `
        ${baseStyles} px-4 py-2
        ${isActive
          ? 'text-rocket-600 border-b-2 border-rocket-600'
          : 'text-gray-500 hover:text-gray-700'
        }
      `,
    },
  };

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
  };

  return (
    <div className={`flex ${variants[variant].container} ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && handleChange(tab.id)}
          disabled={tab.disabled}
          className={`
            ${variants[variant].tab(currentTab === tab.id)}
            ${sizes[size]}
            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`
              ml-1.5 px-1.5 py-0.5 text-xs rounded-full
              ${currentTab === tab.id ? 'bg-rocket-100 text-rocket-600' : 'bg-gray-200 text-gray-600'}
            `}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
