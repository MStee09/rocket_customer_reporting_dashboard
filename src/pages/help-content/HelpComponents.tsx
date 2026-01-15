import { AlertCircle, Info } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex gap-3 p-4 bg-gray-50 rounded-lg border">
      <div className="p-2 bg-rocket-100 rounded-lg h-fit">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-900 m-0">{title}</h4>
        <p className="text-sm text-gray-600 m-0 mt-1">{description}</p>
      </div>
    </div>
  );
}

interface CalloutProps {
  type: 'tip' | 'info' | 'warning' | 'example';
  children: React.ReactNode;
}

export function Callout({ type, children }: CalloutProps) {
  const styles = {
    tip: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-rocket-50 border-rocket-200 text-rocket-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    example: 'bg-slate-50 border-slate-200 text-slate-800',
  };

  const icons = {
    tip: <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-rocket-600 flex-shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />,
    example: <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />,
  };

  const labels = {
    tip: 'Tip',
    info: 'Info',
    warning: 'Note',
    example: 'Example',
  };

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles[type]} my-4`}>
      {icons[type]}
      <div>
        <div className="font-medium mb-1">{labels[type]}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4 my-4">
      <div className="flex-shrink-0 w-8 h-8 bg-rocket-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  );
}
