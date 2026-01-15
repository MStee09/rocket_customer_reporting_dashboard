import { Link } from 'react-router-dom';
import { Sparkles, FileText, ArrowRight } from 'lucide-react';

export function AnalyticsPage() {
  const analyticsTools = [
    {
      title: 'AI Report Studio',
      description: 'Describe what you want in plain English and let AI create it for you.',
      icon: Sparkles,
      path: '/ai-studio',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      hoverBg: 'hover:border-amber-200',
    },
    {
      title: 'Custom Report Builder',
      description: 'Build reports by selecting columns, filters, groupings and visualizations.',
      icon: FileText,
      path: '/custom-reports',
      iconBg: 'bg-rocket-100',
      iconColor: 'text-rocket-600',
      hoverBg: 'hover:border-rocket-200',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create</h1>
        <p className="text-slate-600 mt-1">Build reports and analyze your freight data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyticsTools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className={`group bg-white rounded-xl border border-slate-200 p-6 transition-all ${tool.hoverBg} hover:shadow-lg hover:-translate-y-0.5`}
          >
            <div className={`w-14 h-14 ${tool.iconBg} rounded-xl flex items-center justify-center mb-4`}>
              <tool.icon className={`w-7 h-7 ${tool.iconColor}`} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{tool.title}</h3>
            <p className="text-slate-600 mb-4 leading-relaxed">{tool.description}</p>
            <div className="flex items-center gap-2 text-sm font-medium text-rocket-600 group-hover:gap-3 transition-all">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">Pro Tip</h3>
        <p className="text-slate-600">
          Use the <strong>AI Report Studio</strong> to describe what you need in plain English.
          The AI will build visualizations, tables, and insights automatically.
          Or use the <strong>Custom Builder</strong> for precise control over columns and groupings.
        </p>
      </div>
    </div>
  );
}

export default AnalyticsPage;
