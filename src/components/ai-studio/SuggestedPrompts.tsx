import { FileText, Sparkles, X, Loader2, MapPin, Truck, TrendingUp, DollarSign } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/aiReportService';
import { ChatMessage } from './ChatMessage';
import { Card } from '../ui/Card';

export interface DataProfile {
  totalShipments: number;
  stateCount: number;
  carrierCount: number;
  monthsOfData: number;
  hasCanadaData: boolean;
  topStates: string[];
  topCarriers: string[];
  avgShipmentsPerDay: number;
}

interface SuggestionCategory {
  category: string;
  icon: typeof MapPin;
  prompts: Array<{
    text: string;
    description: string;
  }>;
}

const DEFAULT_SUGGESTIONS = [
  'Show me total spend by transportation mode',
  'Create an executive summary of shipping activity',
  'Analyze my top shipping lanes by volume',
  'Compare costs across different equipment types',
];

function getDataAwareSuggestions(dataProfile: DataProfile | null): SuggestionCategory[] {
  if (!dataProfile || dataProfile.totalShipments === 0) {
    return [];
  }

  const suggestions: SuggestionCategory[] = [];

  if (dataProfile.stateCount >= 5) {
    suggestions.push({
      category: 'Geographic',
      icon: MapPin,
      prompts: [
        {
          text: 'Where do my shipments go?',
          description: `See distribution across your ${dataProfile.stateCount} destination states`,
        },
        {
          text: 'Which states cost the most to serve?',
          description: 'Heat map of average cost by destination',
        },
      ],
    });
  }

  if (dataProfile.carrierCount >= 2) {
    suggestions.push({
      category: 'Carriers',
      icon: Truck,
      prompts: [
        {
          text: 'Compare my carriers',
          description: `Analyze your ${dataProfile.carrierCount} carriers on cost, speed & volume`,
        },
        {
          text: 'Which carrier should I use more?',
          description: 'Performance comparison with recommendations',
        },
      ],
    });
  }

  if (dataProfile.monthsOfData >= 3) {
    suggestions.push({
      category: 'Trends',
      icon: TrendingUp,
      prompts: [
        {
          text: 'How has my shipping changed?',
          description: `Trends over your ${dataProfile.monthsOfData} months of data`,
        },
        {
          text: 'When are my busiest days?',
          description: 'Calendar view of shipping patterns',
        },
      ],
    });
  }

  suggestions.push({
    category: 'Cost Analysis',
    icon: DollarSign,
    prompts: [
      {
        text: 'What drives my freight costs?',
        description: 'Breakdown by carrier, mode, and destination',
      },
      {
        text: "What's my cost per unit?",
        description: 'Calculate efficiency metrics',
      },
    ],
  });

  return suggestions;
}

interface WidgetContext {
  title: string;
  [key: string]: unknown;
}

interface SuggestedPromptsProps {
  messages: ChatMessageType[];
  widgetContext: WidgetContext | null;
  onClearContext: () => void;
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  dataProfile?: DataProfile | null;
}

export function SuggestedPrompts({
  messages,
  widgetContext,
  onClearContext,
  onSendMessage,
  isGenerating,
  messagesEndRef,
  dataProfile,
}: SuggestedPromptsProps) {
  const dataAwareSuggestions = getDataAwareSuggestions(dataProfile || null);
  const hasDataProfile = dataAwareSuggestions.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {widgetContext && (
        <div className="mb-4 p-3 bg-rocket-50 border border-rocket-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rocket-600" />
            <span className="text-sm text-rocket-700">
              Analyzing: <span className="font-medium">{widgetContext.title}</span>
            </span>
          </div>
          <button
            onClick={onClearContext}
            className="text-rocket-500 hover:text-rocket-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-rocket-500 to-rocket-600 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            What would you like to see?
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {hasDataProfile
              ? `Based on your ${dataProfile?.totalShipments.toLocaleString()} shipments, here are some insights you might find useful`
              : 'Describe the report you want to create and watch it build in real-time'}
          </p>

          {hasDataProfile ? (
            <div className="max-w-2xl mx-auto space-y-6">
              {dataAwareSuggestions.map((category, categoryIndex) => {
                const Icon = category.icon;
                return (
                  <div key={categoryIndex}>
                    <div className="flex items-center gap-2 mb-3 text-left">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{category.category}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {category.prompts.map((prompt, promptIndex) => (
                        <Card
                          key={promptIndex}
                          variant="default"
                          padding="md"
                          hover={true}
                          onClick={() => !isGenerating && onSendMessage(prompt.text)}
                          className="w-full text-left disabled:opacity-50 group"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-900 font-medium group-hover:text-rocket-600">
                              {prompt.text}
                            </span>
                            <span className="text-sm text-gray-500">
                              {prompt.description}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 max-w-lg mx-auto">
              {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
                <Card
                  key={index}
                  variant="default"
                  padding="md"
                  hover={true}
                  onClick={() => !isGenerating && onSendMessage(suggestion)}
                  className="w-full text-left disabled:opacity-50 group"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-rocket-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 group-hover:text-gray-900">
                      {suggestion}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isCompact={false}
            />
          ))}
          {isGenerating && (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating your report...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
