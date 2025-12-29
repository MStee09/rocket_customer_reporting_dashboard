import { useState } from 'react';
import {
  Book, Search, ChevronRight, ChevronDown,
  LayoutDashboard, Truck, BarChart3,
  Building2, Settings, Bell, BookOpen, MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  OverviewContent,
  NavigationContent,
  CustomerSwitchingContent,
  DateRangesContent,
  MetricsContent,
  WidgetsContent,
  AIInsightsContent,
  AskAIContent,
  ViewingShipmentsContent,
  SearchingContent,
  FilteringContent,
  ShipmentDetailsContent,
  ExportingContent,
  AnalyticsHubContent,
  AIStudioContent,
  CustomReportsContent,
  ScheduledReportsContent,
  CarrierPerformanceContent,
  CarrierComparisonContent,
  CustomerProfilesContent,
  KnowledgeBaseContent,
  LearningQueueContent,
  UserManagementContent,
  ImpersonationContent,
  NotificationCenterContent,
  AlertTypesContent,
  ContactSupportContent,
  FAQContent
} from './HowToContent';
import { Card } from '../components/ui/Card';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  subsections: {
    id: string;
    title: string;
    content: React.ReactNode;
    adminOnly?: boolean;
  }[];
}

function PrevNextButton({
  sections,
  currentSection,
  currentSubsection,
  direction,
  onNavigate
}: {
  sections: DocSection[];
  currentSection: string;
  currentSubsection: string;
  direction: 'prev' | 'next';
  onNavigate: (sectionId: string, subsectionId: string) => void;
}) {
  const allItems: { sectionId: string; subsectionId: string; title: string }[] = [];
  sections.forEach(section => {
    section.subsections.forEach(sub => {
      allItems.push({
        sectionId: section.id,
        subsectionId: sub.id,
        title: sub.title,
      });
    });
  });

  const currentIndex = allItems.findIndex(
    item => item.sectionId === currentSection && item.subsectionId === currentSubsection
  );

  const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
  const target = allItems[targetIndex];

  if (!target) return <div />;

  return (
    <button
      onClick={() => onNavigate(target.sectionId, target.subsectionId)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors
        ${direction === 'prev' ? 'flex-row' : 'flex-row-reverse'}
      `}
    >
      <ChevronRight className={`w-4 h-4 text-gray-400 ${direction === 'prev' ? 'rotate-180' : ''}`} />
      <div className={direction === 'prev' ? 'text-left' : 'text-right'}>
        <div className="text-xs text-gray-500">{direction === 'prev' ? 'Previous' : 'Next'}</div>
        <div className="font-medium text-gray-900">{target.title}</div>
      </div>
    </button>
  );
}

export function HowToPage() {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeSubsection, setActiveSubsection] = useState('overview');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigateTo = (sectionId: string, subsectionId: string) => {
    setActiveSection(sectionId);
    setActiveSubsection(subsectionId);
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId]);
    }
  };

  const allDocSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'overview', title: 'Dashboard Overview', content: <OverviewContent /> },
        { id: 'navigation', title: 'Navigation Guide', content: <NavigationContent isAdmin={isAdmin} /> },
        { id: 'customer-switching', title: 'Switching Customers', content: <CustomerSwitchingContent isAdmin={isAdmin} /> },
        { id: 'date-ranges', title: 'Using Date Ranges', content: <DateRangesContent /> },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'metrics', title: 'Understanding Metrics', content: <MetricsContent /> },
        { id: 'widgets', title: 'Dashboard Widgets', content: <WidgetsContent /> },
        { id: 'ai-insights', title: 'AI Insights Card', content: <AIInsightsContent /> },
        { id: 'ask-ai', title: 'Ask AI Buttons', content: <AskAIContent /> },
      ]
    },
    {
      id: 'shipments',
      title: 'Shipments',
      icon: <Truck className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'viewing', title: 'Viewing Shipments', content: <ViewingShipmentsContent /> },
        { id: 'searching', title: 'Smart Search', content: <SearchingContent /> },
        { id: 'filtering', title: 'Quick Filters', content: <FilteringContent /> },
        { id: 'details', title: 'Shipment Details', content: <ShipmentDetailsContent /> },
        { id: 'exporting', title: 'Exporting Data', content: <ExportingContent /> },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'analytics-hub', title: 'Analytics Hub', content: <AnalyticsHubContent /> },
        { id: 'ai-studio', title: 'AI Report Studio', content: <AIStudioContent /> },
        { id: 'custom-reports', title: 'Custom Reports', content: <CustomReportsContent /> },
        { id: 'scheduled-reports', title: 'Scheduled Reports', content: <ScheduledReportsContent /> },
      ]
    },
    {
      id: 'carriers',
      title: 'Carriers',
      icon: <Building2 className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'carrier-performance', title: 'Carrier Performance', content: <CarrierPerformanceContent /> },
        { id: 'carrier-comparison', title: 'Comparing Carriers', content: <CarrierComparisonContent /> },
      ]
    },
    {
      id: 'admin',
      title: 'Admin Features',
      icon: <Settings className="w-5 h-5" />,
      adminOnly: true,
      subsections: [
        { id: 'customer-profiles', title: 'Customer Intelligence Profiles', content: <CustomerProfilesContent /> },
        { id: 'knowledge-base', title: 'Knowledge Base', content: <KnowledgeBaseContent /> },
        { id: 'learning-queue', title: 'Learning Queue', content: <LearningQueueContent /> },
        { id: 'user-management', title: 'User Management', content: <UserManagementContent /> },
        { id: 'impersonation', title: 'View As Customer', content: <ImpersonationContent /> },
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'notification-center', title: 'Notification Center', content: <NotificationCenterContent /> },
        { id: 'alert-types', title: 'Alert Types', content: <AlertTypesContent isAdmin={isAdmin} /> },
      ]
    },
    {
      id: 'support',
      title: 'Getting Help',
      icon: <MessageCircle className="w-5 h-5" />,
      adminOnly: false,
      subsections: [
        { id: 'contact-support', title: 'Contact Support', content: <ContactSupportContent /> },
        { id: 'faq', title: 'FAQ', content: <FAQContent isAdmin={isAdmin} /> },
      ]
    },
  ];

  const docSections = allDocSections
    .filter(section => !section.adminOnly || isAdmin)
    .map(section => ({
      ...section,
      subsections: section.subsections.filter(sub => !sub.adminOnly || isAdmin)
    }));

  const filteredSections = searchQuery
    ? docSections.map(section => ({
        ...section,
        subsections: section.subsections.filter(sub =>
          sub.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.subsections.length > 0)
    : docSections;

  const currentSection = docSections.find(s => s.id === activeSection);
  const currentSubsection = currentSection?.subsections.find(s => s.id === activeSubsection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Book className="w-6 h-6 text-rocket-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">How To Guide</h1>
                <p className="text-sm text-gray-500">Complete documentation for the Freight Reporting Dashboard</p>
              </div>
            </div>

            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <nav className="w-72 shrink-0">
            <Card variant="default" padding="none" className="sticky top-24">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Contents</h2>
              </div>
              <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredSections.map(section => (
                  <div key={section.id} className="mb-1">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
                        ${activeSection === section.id ? 'bg-rocket-50 text-rocket-700' : 'hover:bg-gray-50 text-gray-700'}
                      `}
                    >
                      {section.icon}
                      <span className="flex-1 font-medium">{section.title}</span>
                      {expandedSections.includes(section.id)
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </button>

                    {expandedSections.includes(section.id) && (
                      <div className="ml-7 mt-1 space-y-1">
                        {section.subsections.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => navigateTo(section.id, sub.id)}
                            className={`
                              w-full text-left px-3 py-1.5 rounded text-sm transition-colors
                              ${activeSection === section.id && activeSubsection === sub.id
                                ? 'bg-rocket-100 text-rocket-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </nav>

          <main className="flex-1 min-w-0">
            <Card variant="default" padding="lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <span>{currentSection?.title}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">{currentSubsection?.title}</span>
              </div>

              <div className="prose prose-blue max-w-none">
                {currentSubsection?.content}
              </div>

              <div className="flex justify-between mt-12 pt-6 border-t">
                <PrevNextButton
                  sections={docSections}
                  currentSection={activeSection}
                  currentSubsection={activeSubsection}
                  direction="prev"
                  onNavigate={navigateTo}
                />
                <PrevNextButton
                  sections={docSections}
                  currentSection={activeSection}
                  currentSubsection={activeSubsection}
                  direction="next"
                  onNavigate={navigateTo}
                />
              </div>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
