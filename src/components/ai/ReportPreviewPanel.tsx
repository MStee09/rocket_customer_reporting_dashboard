import { useState } from 'react';
import {
  X,
  Download,
  FileText,
  BarChart3,
  Table,
  Hash,
  TrendingUp,
  ChevronRight,
  Printer,
  Copy,
  Check
} from 'lucide-react';
import type { ReportDraft, DraftSection } from '../../ai/investigator/types';

interface ReportPreviewPanelProps {
  report: ReportDraft;
  onClose: () => void;
  onExport?: () => void;
}

export function ReportPreviewPanel({ report, onClose, onExport }: ReportPreviewPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    const reportText = generateReportText(report);
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateReportText = (report: ReportDraft): string => {
    let text = `# ${report.name}\n\n`;
    if (report.description) {
      text += `${report.description}\n\n`;
    }
    text += `Generated: ${new Date(report.metadata.createdAt).toLocaleDateString()}\n\n`;
    text += `---\n\n`;

    report.sections.forEach((section, index) => {
      text += `## ${index + 1}. ${section.title || `Section ${index + 1}`}\n`;
      text += `Type: ${section.type}\n`;
      if (section.preview?.dataPreview) {
        text += `Data: ${section.preview.dataPreview.rowCount} rows\n`;
      }
      if (section.insights?.length > 0) {
        text += `\nInsights:\n`;
        section.insights.forEach(insight => {
          text += `- ${insight.title}: ${insight.description}\n`;
        });
      }
      text += `\n`;
    });

    return text;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 truncate max-w-[280px]">
                {report.name}
              </h2>
              <p className="text-xs text-gray-500">
                {report.sections.length} sections • {report.theme} theme
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex gap-2">
        <button
          onClick={handleCopyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors ml-auto"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {report.description && (
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            {report.description}
          </p>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Report Sections
          </h3>

          {report.sections.map((section, index) => (
            <SectionCard key={section.id} section={section} index={index} />
          ))}
        </div>

        {report.sections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sections added yet</p>
            <p className="text-sm">Ask The Investigator to add sections to your report</p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Created {new Date(report.metadata.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ section, index }: { section: DraftSection; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'hero': return <Hash className="w-4 h-4" />;
      case 'chart': return <BarChart3 className="w-4 h-4" />;
      case 'table': return <Table className="w-4 h-4" />;
      case 'stat-row': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const typeColors: Record<string, string> = {
    hero: 'bg-purple-100 text-purple-700',
    chart: 'bg-blue-100 text-blue-700',
    table: 'bg-green-100 text-green-700',
    'stat-row': 'bg-amber-100 text-amber-700',
    header: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {section.title || `Section ${index + 1}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeColors[section.type] || 'bg-gray-100 text-gray-700'}`}>
              {getSectionIcon(section.type)}
              {section.type}
            </span>
            {section.preview?.dataPreview && (
              <span className="text-xs text-gray-500">
                {section.preview.dataPreview.rowCount} rows
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-100">
          {section.preview?.dataPreview && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Preview: {section.preview.dataPreview.rowCount} rows
              </p>
              {section.preview.dataPreview.aggregatedValues && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {Object.entries(section.preview.dataPreview.aggregatedValues).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section.insights && section.insights.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Insights:</p>
              <ul className="space-y-1">
                {section.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>
                      <span className="font-medium">{insight.title}:</span> {insight.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.config && Object.keys(section.config).length > 0 && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-x-auto">
              {JSON.stringify(section.config, null, 2).substring(0, 200)}
              {JSON.stringify(section.config).length > 200 && '...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
