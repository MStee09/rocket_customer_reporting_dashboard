interface StatusTabProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: 'gray' | 'blue' | 'orange' | 'green' | 'red';
}

export function StatusTab({
  label,
  count,
  active,
  onClick,
  color = 'gray',
}: StatusTabProps) {
  const colorClasses: Record<string, string> = {
    gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    blue: active ? 'bg-rocket-600 text-white' : 'bg-rocket-50 text-rocket-700 hover:bg-rocket-100',
    orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${colorClasses[color]}`}
    >
      {label}
      <span className={`ml-2 ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
    </button>
  );
}

interface StatusTabsProps {
  statusCounts: Record<string, number>;
  activeStatus: string;
  onStatusChange: (status: string) => void;
  totalCount: number;
}

export function StatusTabs({
  statusCounts,
  activeStatus,
  onStatusChange,
  totalCount,
}: StatusTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <StatusTab
        label="All"
        count={totalCount}
        active={activeStatus === 'all'}
        onClick={() => onStatusChange('all')}
      />
      <StatusTab
        label="In Transit"
        count={statusCounts['In Transit'] || 0}
        active={activeStatus === 'In Transit'}
        onClick={() => onStatusChange('In Transit')}
        color="blue"
      />
      <StatusTab
        label="Pending Pickup"
        count={statusCounts['Pending Pickup'] || 0}
        active={activeStatus === 'Pending Pickup'}
        onClick={() => onStatusChange('Pending Pickup')}
        color="orange"
      />
      <StatusTab
        label="Delivered"
        count={statusCounts['Delivered'] || 0}
        active={activeStatus === 'Delivered'}
        onClick={() => onStatusChange('Delivered')}
        color="green"
      />
      <StatusTab
        label="Completed"
        count={statusCounts['Completed'] || 0}
        active={activeStatus === 'Completed'}
        onClick={() => onStatusChange('Completed')}
        color="green"
      />
      {(statusCounts['Cancelled'] || 0) > 0 && (
        <StatusTab
          label="Cancelled"
          count={statusCounts['Cancelled'] || 0}
          active={activeStatus === 'Cancelled'}
          onClick={() => onStatusChange('Cancelled')}
          color="red"
        />
      )}
    </div>
  );
}
