import { useState, useCallback } from 'react';

interface UseCopyToClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCopyToClipboard(resetDelay: number = 2000): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);

      if (resetDelay > 0) {
        setTimeout(() => setCopied(false), resetDelay);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to copy'));
      setCopied(false);
      return false;
    }
  }, [resetDelay]);

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return { copy, copied, error, reset };
}
