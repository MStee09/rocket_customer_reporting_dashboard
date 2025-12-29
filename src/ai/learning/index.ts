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
