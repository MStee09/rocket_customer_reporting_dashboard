# Edge Function Integration Changes

## File: `supabase/functions/generate-report/index.ts`

### Step 1: Add import (after line 10)

Find this line:
```typescript
import { maybeSummarizeConversation } from "./services/summarizationService.ts";
```

Add this line AFTER it:
```typescript
import { processAIResponse } from "./services/outputValidation.ts";
```

---

### Step 2: Update tool-based response path (lines ~1150-1172)

Find this code block:
```typescript
      const inputCost = totalInputTokens * 0.000003;
      const outputCost = totalOutputTokens * 0.000015;
      const totalCost = inputCost + outputCost;

      return new Response(JSON.stringify({
        report: finalReport,
        message: needsClarification ? clarificationQuestion : finalMessage,
        toolExecutions,
        learnings: learnings.length > 0 ? learnings : undefined,
        needsClarification,
        clarificationOptions,
        summarized: summarizationResult.summarized,
        tokensSaved: summarizationResult.tokensSaved,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          inputCostUsd: inputCost,
          outputCostUsd: outputCost,
          totalCostUsd: totalCost,
          latencyMs
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
```

Replace it with:
```typescript
      // Validate AI message before sending to client
      const messageToValidate = needsClarification ? clarificationQuestion : finalMessage;
      const messageValidation = processAIResponse(
        messageToValidate,
        isAdmin,
        { logViolations: true }
      );

      const inputCost = totalInputTokens * 0.000003;
      const outputCost = totalOutputTokens * 0.000015;
      const totalCost = inputCost + outputCost;

      return new Response(JSON.stringify({
        report: finalReport,
        message: messageValidation.message,  // Use validated/sanitized message
        toolExecutions,
        learnings: learnings.length > 0 ? learnings : undefined,
        needsClarification,
        clarificationOptions,
        summarized: summarizationResult.summarized,
        tokensSaved: summarizationResult.tokensSaved,
        // Include validation metadata when message was modified
        outputValidation: messageValidation.wasModified ? {
          wasModified: true,
          severity: messageValidation.validation.severity,
          warnings: messageValidation.validation.warnings
        } : undefined,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          inputCostUsd: inputCost,
          outputCostUsd: outputCost,
          totalCostUsd: totalCost,
          latencyMs
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
```

---

### Step 3: Update non-tool response path (lines ~1252-1277)

Find this code block:
```typescript
    const cleanMessage = responseText
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/<learning_flag>[\s\S]*?<\/learning_flag>/g, "")
      .trim();

    const inputCost = response.usage.input_tokens * 0.000003;
    const outputCost = response.usage.output_tokens * 0.000015;
    const totalCost = inputCost + outputCost;

    return new Response(JSON.stringify({
      report: parsedReport,
      message: cleanMessage || (parsedReport ? "Report generated" : responseText),
      learnings: learnings.length > 0 ? learnings : undefined,
      toolExecutions: [],
      summarized: summarizationResult.summarized,
      tokensSaved: summarizationResult.tokensSaved,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        inputCostUsd: inputCost,
        outputCostUsd: outputCost,
        totalCostUsd: totalCost,
        latencyMs
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
```

Replace it with:
```typescript
    const cleanMessage = responseText
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/<learning_flag>[\s\S]*?<\/learning_flag>/g, "")
      .trim();

    // Validate AI message before sending to client
    const messageToValidate = cleanMessage || (parsedReport ? "Report generated" : responseText);
    const messageValidation = processAIResponse(
      messageToValidate,
      isAdmin,
      { logViolations: true }
    );

    const inputCost = response.usage.input_tokens * 0.000003;
    const outputCost = response.usage.output_tokens * 0.000015;
    const totalCost = inputCost + outputCost;

    return new Response(JSON.stringify({
      report: parsedReport,
      message: messageValidation.message,  // Use validated/sanitized message
      learnings: learnings.length > 0 ? learnings : undefined,
      toolExecutions: [],
      summarized: summarizationResult.summarized,
      tokensSaved: summarizationResult.tokensSaved,
      // Include validation metadata when message was modified
      outputValidation: messageValidation.wasModified ? {
        wasModified: true,
        severity: messageValidation.validation.severity,
        warnings: messageValidation.validation.warnings
      } : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        inputCostUsd: inputCost,
        outputCostUsd: outputCost,
        totalCostUsd: totalCost,
        latencyMs
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~11 | Add `import { processAIResponse }` |
| Lines ~1150-1172 | Add validation before tool-based response |
| Lines ~1252-1277 | Add validation before non-tool response |

Total lines changed: ~40 lines added/modified
