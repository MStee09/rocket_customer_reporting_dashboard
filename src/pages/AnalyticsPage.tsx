import { Link } from 'react-router-dom';
import { Sparkles, FileText, LayoutGrid, BarChart3, TrendingUp, Database } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';

export function AnalyticsPage() {
  const analyticsTools = [
    {
      title: 'AI Report Studio',
      description: 'Generate custom reports with natural language. Ask questions and get instant insights.',
      icon: Sparkles,
      path: '/ai-studio',
      color: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Custom Reports',
      description: 'Build and save custom reports with advanced filtering and grouping options.',
      icon: FileText,
      path: '/custom-reports',
      color: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Widget Library',
      description: 'Browse and add pre-built widgets to your dashboard for quick insights.',
      icon: LayoutGrid,
      path: '/widget-library',
      color: 'from-violet-500 to-purple-500',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400',
    },
  ];

  const quickStats = [
    { label: 'Total Reports', value: '12', icon: FileText },
    { label: 'Active Widgets', value: '8', icon: LayoutGrid },
    { label: 'Data Sources', value: '3', icon: Database },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analytics Hub</h1>
              <p className="text-slate-600">
                Explore your data with powerful analytics and reporting tools
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Analytics Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analyticsTools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-slate-300"
              >
                <div className={`w-14 h-14 ${tool.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <tool.icon className={`w-7 h-7 ${tool.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {tool.description}
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm font-medium text-blue-600 group-hover:gap-3 transition-all">
                  <span>Open Tool</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-8">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Need Help Getting Started?
              </h3>
              <p className="text-slate-700 mb-4">
                Our AI Report Studio makes it easy to analyze your data. Just ask questions in plain English and get instant insights.
              </p>
              <Link
                to="/ai-studio"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Try AI Studio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
