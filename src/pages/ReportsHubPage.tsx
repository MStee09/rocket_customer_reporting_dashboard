import { Link } from 'react-router-dom';
import { FileText, Calendar, Clock, CheckCircle, TrendingUp, Download } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';

export function ReportsHubPage() {
  const reportTypes = [
    {
      title: 'Scheduled Reports',
      description: 'Automate report generation and delivery. Set up recurring reports for stakeholders.',
      icon: Calendar,
      path: '/scheduled-reports',
      color: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      stats: { label: 'Active', value: '5' },
    },
    {
      title: 'Custom Reports',
      description: 'Create one-time custom reports with flexible filtering and export options.',
      icon: FileText,
      path: '/custom-reports',
      color: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      stats: { label: 'Saved', value: '12' },
    },
  ];

  const recentActivity = [
    {
      title: 'Monthly Shipment Summary',
      timestamp: '2 hours ago',
      status: 'completed',
      type: 'scheduled',
    },
    {
      title: 'Q4 Cost Analysis',
      timestamp: '5 hours ago',
      status: 'completed',
      type: 'custom',
    },
    {
      title: 'Weekly Carrier Performance',
      timestamp: 'Yesterday',
      status: 'completed',
      type: 'scheduled',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reports Hub</h1>
              <p className="text-slate-600">
                Manage and generate reports for your freight operations
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Report Types</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportTypes.map((report) => (
                  <Link
                    key={report.path}
                    to={report.path}
                    className="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 ${report.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <report.icon className={`w-6 h-6 ${report.iconColor}`} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-medium">{report.stats.label}</div>
                        <div className="text-2xl font-bold text-slate-900">{report.stats.value}</div>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:gap-3 transition-all">
                      <span>Manage Reports</span>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Export Options
                  </h3>
                  <p className="text-sm text-slate-700">
                    All reports can be exported to PDF, Excel, or CSV formats for easy sharing and analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{activity.timestamp}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 capitalize">{activity.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/scheduled-reports"
                className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 mt-4 pt-4 border-t border-slate-100"
              >
                View All Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
