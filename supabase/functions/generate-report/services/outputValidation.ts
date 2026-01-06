import { RESTRICTED_FIELDS, findRestrictedFieldsInString } from "./restrictedFields.ts";

const FINANCIAL_PATTERNS: RegExp[] = [
  /\$[\d,]+\.?\d*\s*(cost|margin|profit|markup|net|wholesale|commission)/gi,
  /cost\s*(is|was|of|:)\s*\$[\d,]+\.?\d*/gi,
  /margin\s*(is|was|of|:)\s*\$?[\d,]+\.?\d*%?/gi,
  /profit\s*(is|was|of|:)\s*\$[\d,]+\.?\d*/gi,
  /markup\s*(is|was|of|:)\s*[\d,]+\.?\d*%?/gi,
  /wholesale\s*(price|rate|cost)\s*(is|was|of|:)?\s*\$[\d,]+\.?\d*/gi,
  /buy\s*rate\s*(is|was|of|:)?\s*\$[\d,]+\.?\d*/gi,
  /carrier\s*cost\s*(is|was|of|:)?\s*\$[\d,]+\.?\d*/gi,
  /commission\s*(is|was|of|:)?\s*\$?[\d,]+\.?\d*%?/gi,
  /net\s*revenue\s*(is|was|of|:)?\s*\$[\d,]+\.?\d*/gi,
  /[\d]+\.?\d*%?\s*margin/gi,
  /[\d]+\.?\d*%?\s*profit/gi,
  /[\d]+\.?\d*%?\s*markup/gi,
  /margin\s*of\s*[\d]+\.?\d*%/gi,
  /cost.*\$[\d,]+.*vs.*retail/gi,
  /margin.*between.*[\d]+.*and.*[\d]+/gi,
  /profit\s*(is|of|was)\s*\$[\d,]+/gi,
  /we\s*(paid|pay|charge)\s*\$[\d,]+.*carrier/gi,
  /carrier\s*(charges?|costs?|paid)\s*\$[\d,]+/gi,
];

const SAFE_PHRASE_PATTERNS: RegExp[] = [
  /cost\s*(data|information|details?)\s*(is\s*)?(not\s+)?(available|accessible|shown|visible)/gi,
  /margin\s*(data|information|details?)\s*(is\s*)?(not\s+)?(available|accessible|shown|visible)/gi,
  /profit\s*(data|information|details?)\s*(is\s*)?(not\s+)?(available|accessible|shown|visible)/gi,
  /(cannot|can't|don't|do not|unable to)\s*(show|display|provide|reveal|share|access)\s*(the\s*)?(cost|margin|profit|markup|wholesale)/gi,
  /restricted\s*(field|data|information|access)/gi,
  /(no|not|don't have)\s*access\s*to\s*(cost|margin|profit|internal)/gi,
  /customer\s*(users?|accounts?)\s*(cannot|can't|don't)\s*(see|access|view)/gi,
  /this\s*(information|data)\s*is\s*(restricted|confidential|internal)/gi,
  /only\s*(admin|internal)\s*(users?)?\s*(can|have)\s*access/gi,
  /not\s*included\s*in\s*(your|customer)\s*(reports?|data|view)/gi,
];

const ALWAYS_FLAG_PATTERNS: RegExp[] = [
  /our\s*margin\s*(is|was)/gi,
  /we\s*make\s*\$[\d,]+/gi,
  /profit\s*per\s*(shipment|load|mile)/gi,
  /internal\s*(cost|rate|price)/gi,
  /buy\s*side/gi,
  /carrier\s*invoice/gi,
];

export interface MessageValidationResult {
  isValid: boolean;
  restrictedFieldsFound: string[];
  financialPatternsFound: string[];
  alwaysFlagPatternsFound: string[];
  sanitizedMessage: string;
  warnings: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    originalLength: number;
    sanitizedLength: number;
    checksPerformed: number;
    processingTimeMs: number;
  };
}

function isWithinSafeContext(text: string, position: number, matchLength: number): boolean {
  const contextStart = Math.max(0, position - 150);
  const contextEnd = Math.min(text.length, position + matchLength + 150);
  const context = text.slice(contextStart, contextEnd);

  return SAFE_PHRASE_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(context);
  });
}

function findAllMatches(text: string, pattern: RegExp): Array<{match: string, index: number}> {
  const matches: Array<{match: string, index: number}> = [];
  const regex = new RegExp(pattern.source, pattern.flags);
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push({ match: match[0], index: match.index });
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return matches;
}

export function validateAIOutput(message: string, isAdmin: boolean): MessageValidationResult {
  const startTime = Date.now();
  let checksPerformed = 0;

  if (isAdmin) {
    return {
      isValid: true,
      restrictedFieldsFound: [],
      financialPatternsFound: [],
      alwaysFlagPatternsFound: [],
      sanitizedMessage: message,
      warnings: [],
      severity: 'none',
      metadata: {
        originalLength: message.length,
        sanitizedLength: message.length,
        checksPerformed: 1,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  const warnings: string[] = [];
  const restrictedFieldsFound: string[] = [];
  const financialPatternsFound: string[] = [];
  const alwaysFlagPatternsFound: string[] = [];

  checksPerformed++;
  const foundFields = findRestrictedFieldsInString(message);

  for (const field of foundFields) {
    const matches = findAllMatches(message, new RegExp(field, 'gi'));

    for (const { match, index } of matches) {
      checksPerformed++;
      if (!isWithinSafeContext(message, index, match.length)) {
        if (!restrictedFieldsFound.includes(field)) {
          restrictedFieldsFound.push(field);
        }
      }
    }
  }

  for (const pattern of FINANCIAL_PATTERNS) {
    checksPerformed++;
    const matches = findAllMatches(message, pattern);

    for (const { match, index } of matches) {
      if (!isWithinSafeContext(message, index, match.length)) {
        financialPatternsFound.push(match.trim());
      }
    }
  }

  for (const pattern of ALWAYS_FLAG_PATTERNS) {
    checksPerformed++;
    const matches = findAllMatches(message, pattern);

    for (const { match } of matches) {
      alwaysFlagPatternsFound.push(match.trim());
    }
  }

  let severity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

  if (alwaysFlagPatternsFound.length > 0) {
    severity = 'critical';
  } else if (financialPatternsFound.length > 0) {
    severity = 'high';
  } else if (restrictedFieldsFound.length > 3) {
    severity = 'medium';
  } else if (restrictedFieldsFound.length > 0) {
    severity = 'low';
  }

  if (alwaysFlagPatternsFound.length > 0) {
    warnings.push(`CRITICAL: Internal financial terms detected: ${alwaysFlagPatternsFound.slice(0, 3).join(', ')}`);
  }
  if (financialPatternsFound.length > 0) {
    warnings.push(`HIGH: Financial values with restricted terms: ${financialPatternsFound.length} occurrence(s)`);
  }
  if (restrictedFieldsFound.length > 0) {
    warnings.push(`Restricted field keywords found: ${restrictedFieldsFound.join(', ')}`);
  }

  let sanitizedMessage = message;
  if (severity === 'high' || severity === 'critical') {
    sanitizedMessage = sanitizeMessage(message);
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    isValid: severity === 'none' || severity === 'low',
    restrictedFieldsFound,
    financialPatternsFound: [...new Set(financialPatternsFound)],
    alwaysFlagPatternsFound: [...new Set(alwaysFlagPatternsFound)],
    sanitizedMessage,
    warnings,
    severity,
    metadata: {
      originalLength: message.length,
      sanitizedLength: sanitizedMessage.length,
      checksPerformed,
      processingTimeMs
    }
  };
}

function sanitizeMessage(message: string): string {
  let sanitized = message;

  for (const pattern of ALWAYS_FLAG_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[internal data redacted]');
  }

  for (const pattern of FINANCIAL_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[financial data redacted]');
  }

  for (const field of RESTRICTED_FIELDS) {
    const dollarPattern = new RegExp(
      `(${field}[\\s:]*)(\\$[\\d,]+\\.?\\d*)`,
      'gi'
    );
    sanitized = sanitized.replace(dollarPattern, '$1[REDACTED]');

    const percentPattern = new RegExp(
      `(${field}[\\s:]*)(\\d+\\.?\\d*\\s*%)`,
      'gi'
    );
    sanitized = sanitized.replace(percentPattern, '$1[REDACTED]');
  }

  return sanitized;
}

export function processAIResponse(
  message: string,
  isAdmin: boolean,
  options: {
    throwOnCritical?: boolean;
    logViolations?: boolean;
    auditMode?: boolean;
  } = {}
): {
  message: string;
  validation: MessageValidationResult;
  wasModified: boolean;
} {
  const validation = validateAIOutput(message, isAdmin);

  if (options.logViolations && !validation.isValid) {
    console.warn('[OutputValidation] Restricted data detected in AI output:', {
      severity: validation.severity,
      restrictedFields: validation.restrictedFieldsFound,
      financialPatterns: validation.financialPatternsFound.length,
      alwaysFlagPatterns: validation.alwaysFlagPatternsFound,
      checksPerformed: validation.metadata.checksPerformed,
      processingTimeMs: validation.metadata.processingTimeMs
    });
  }

  if (options.throwOnCritical && validation.severity === 'critical') {
    throw new Error(`Critical security violation: AI output contains internal financial data. Patterns found: ${validation.alwaysFlagPatternsFound.join(', ')}`);
  }

  if (options.auditMode) {
    return {
      message: message,
      validation,
      wasModified: false
    };
  }

  const shouldSanitize = validation.severity === 'high' || validation.severity === 'critical';

  return {
    message: shouldSanitize ? validation.sanitizedMessage : message,
    validation,
    wasModified: shouldSanitize && validation.sanitizedMessage !== message
  };
}

export function quickCheckForRestrictedData(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  for (const field of RESTRICTED_FIELDS) {
    if (lowerMessage.includes(field.toLowerCase())) {
      return true;
    }
  }

  for (const pattern of FINANCIAL_PATTERNS.slice(0, 5)) {
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      return true;
    }
  }

  for (const pattern of ALWAYS_FLAG_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      return true;
    }
  }

  return false;
}

export function generateSafeReplacement(): string {
  return `I apologize, but I encountered an issue generating that response. I can help you with information about your shipments, carriers, and delivery performance. What would you like to know?`;
}
