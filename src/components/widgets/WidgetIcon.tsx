import * as LucideIcons from 'lucide-react';

interface WidgetIconProps {
  name: string;
  className?: string;
}

export const WidgetIcon = ({ name, className }: WidgetIconProps) => {
  const IconComponent = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;

  if (!IconComponent) {
    return <LucideIcons.LayoutGrid className={className} />;
  }

  return <IconComponent className={className} />;
};

export default WidgetIcon;
