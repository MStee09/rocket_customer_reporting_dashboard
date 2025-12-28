export interface CustomerPriority {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  context?: string;
  addedAt: string;
  addedBy: string;
}

export interface ProductMapping {
  id: string;
  name: string;
  searchField: string;
  keywords: string[];
  validated: boolean;
  matchCount: number;
  matchPercent: number;
  sampleMatches: string[];
  validatedAt: string;
  isSoftKnowledge: boolean;
}

export interface KeyMarket {
  id: string;
  region: string;
  states: string[];
  volumePercent?: number;
}

export interface TermMapping {
  id: string;
  term: string;
  meaning: string;
}

export interface CustomerIntelligenceProfile {
  id: string;
  customerId: number;
  priorities: CustomerPriority[];
  products: ProductMapping[];
  keyMarkets: KeyMarket[];
  terminology: TermMapping[];
  benchmarkPeriod?: string;
  accountNotes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ProfileHistoryEntry {
  id: string;
  profileId: string;
  customerId: number;
  timestamp: string;
  userId: string;
  userEmail: string;
  changeType: 'add' | 'remove' | 'modify' | 'create';
  fieldChanged: string;
  previousValue: any;
  newValue: any;
  userInput?: string;
  aiInterpretation?: string;
  correlationData?: {
    validated: boolean;
    searchField?: string;
    keywords?: string[];
    matchCount?: number;
    sampleMatches?: string[];
    attemptedFields?: string[];
    savedAsSoft?: boolean;
    reason?: string;
  };
}

export interface AILearningNotification {
  id: string;
  customerId: number;
  customerName?: string;
  createdAt: string;
  conversationId?: string;
  userQuery: string;
  unknownTerm: string;
  aiResponse?: string;
  suggestedField?: string;
  suggestedKeywords?: string[];
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionType?: 'added_hard' | 'added_soft' | 'dismissed';
  resolutionNotes?: string;
}

export interface SavedView {
  id: string;
  userId: string;
  customerId?: number;
  name: string;
  description?: string;
  viewType: 'shipments' | 'report' | 'dashboard_filter';
  viewConfig: Record<string, any>;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CorrelationValidationResult {
  field: string;
  keywords: string[];
  matchCount: number;
  matchPercent: number;
  sampleMatches: string[];
  isValid: boolean;
}
