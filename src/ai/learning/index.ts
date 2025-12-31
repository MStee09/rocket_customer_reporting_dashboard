// src/ai/learning/index.ts

export {
  extractLearnings,
  saveCustomerLearnings,
  parseLearningFlags,
} from './conversationProcessor';

export {
  getCustomerProfile,
  formatProfileForPrompt,
  updateProfileField,
  addLearnedTerm,
} from './profileUpdater';

export { LearningEngine } from './learningEngine';
export type { LearningExtraction } from './learningEngine';

export { PatternTracker } from './patternTracker';
export type { UsagePattern, ProactiveInsight } from './patternTracker';
