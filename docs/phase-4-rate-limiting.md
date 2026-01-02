# PHASE 4: RATE LIMITING (Fair Access)

## Time: ~20 minutes
## Risk: Medium (requires database migration)
## Impact: Prevents abuse, ensures fair access for all customers

---

## PASTE 1 of 3: Run Database Migration in Supabase

**Go to Supabase Dashboard → SQL Editor → New Query**

Paste and run this SQL:

```sql
-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id INTEGER REFERENCES customer(customer_id) ON DELETE CASCADE,
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_user_idx 
ON ai_rate_limits(user_id, request_timestamp);

CREATE INDEX IF NOT EXISTS ai_rate_limits_customer_idx 
ON ai_rate_limits(customer_id, request_timestamp);

CREATE INDEX IF NOT EXISTS ai_rate_limits_timestamp_idx 
ON ai_rate_limits(request_timestamp);

-- Function to check user rate limit
CREATE OR REPLACE FUNCTION check_user_rate_limit(
  p_user_id UUID,
  p_hourly_limit INT DEFAULT 20,
  p_daily_limit INT DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hourly_count INT;
  v_daily_count INT;
  v_hourly_reset TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_hourly_count
  FROM ai_rate_limits
  WHERE user_id = p_user_id
    AND request_timestamp > NOW() - INTERVAL '1 hour';
  
  SELECT COUNT(*) INTO v_daily_count
  FROM ai_rate_limits
  WHERE user_id = p_user_id
    AND request_timestamp > DATE_TRUNC('day', NOW());
  
  v_hourly_reset := DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour';
  
  IF v_hourly_count >= p_hourly_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'limit_type', 'hourly',
      'current_count', v_hourly_count,
      'reset_in_seconds', EXTRACT(EPOCH FROM (v_hourly_reset - NOW()))::INT,
      'message', format('You''ve reached your hourly limit of %s AI requests. Resets in %s minutes.', 
                        p_hourly_limit, 
                        CEIL(EXTRACT(EPOCH FROM (v_hourly_reset - NOW())) / 60))
    );
  END IF;
  
  IF v_daily_count >= p_daily_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'limit_type', 'daily',
      'current_count', v_daily_count,
      'reset_in_seconds', EXTRACT(EPOCH FROM (DATE_TRUNC('day', NOW()) + INTERVAL '1 day' - NOW()))::INT,
      'message', format('You''ve reached your daily limit of %s AI requests. Resets at midnight.', p_daily_limit)
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'hourly_count', v_hourly_count,
    'daily_count', v_daily_count,
    'hourly_remaining', p_hourly_limit - v_hourly_count,
    'daily_remaining', p_daily_limit - v_daily_count
  );
END;
$$;

-- Function to record a request
CREATE OR REPLACE FUNCTION record_rate_limit_request(
  p_user_id UUID,
  p_customer_id INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_rate_limits (user_id, customer_id, request_timestamp)
  VALUES (p_user_id, p_customer_id, NOW());
END;
$$;

-- Cleanup function (run daily via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM ai_rate_limits
  WHERE request_timestamp < NOW() - INTERVAL '2 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION record_rate_limit_request TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO service_role;
```

---

## PASTE 2 of 3: Create Rate Limit Service

**Instruction for Bolt:**
> Create new file `supabase/functions/generate-report/services/rateLimit.ts` with this content:

```typescript
/**
 * RATE LIMIT SERVICE
 * Prevents abuse and ensures fair access
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface RateLimitConfig {
  userRequestsPerHour: number;
  userRequestsPerDay: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  userRequestsPerHour: 20,
  userRequestsPerDay: 100,
};

export interface RateLimitResult {
  allowed: boolean;
  limitType?: 'hourly' | 'daily';
  currentCount?: number;
  resetInSeconds?: number;
  message?: string;
  hourlyRemaining?: number;
  dailyRemaining?: number;
}

export class RateLimitService {
  private supabase: SupabaseClient;
  private config: RateLimitConfig;

  constructor(supabase: SupabaseClient, config: Partial<RateLimitConfig> = {}) {
    this.supabase = supabase;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async checkLimit(userId: string): Promise<RateLimitResult> {
    try {
      const { data, error } = await this.supabase.rpc('check_user_rate_limit', {
        p_user_id: userId,
        p_hourly_limit: this.config.userRequestsPerHour,
        p_daily_limit: this.config.userRequestsPerDay,
      });

      if (error) {
        console.error('[RateLimit] Check failed:', error);
        // Fail open - allow request but log error
        return { allowed: true };
      }

      return {
        allowed: data.allowed,
        limitType: data.limit_type,
        currentCount: data.current_count,
        resetInSeconds: data.reset_in_seconds,
        message: data.message,
        hourlyRemaining: data.hourly_remaining,
        dailyRemaining: data.daily_remaining,
      };
    } catch (e) {
      console.error('[RateLimit] Exception:', e);
      return { allowed: true }; // Fail open
    }
  }

  async recordRequest(userId: string, customerId?: string): Promise<void> {
    try {
      await this.supabase.rpc('record_rate_limit_request', {
        p_user_id: userId,
        p_customer_id: customerId ? parseInt(customerId, 10) : null,
      });
    } catch (e) {
      console.error('[RateLimit] Record failed:', e);
    }
  }
}

export function createRateLimitResponse(result: RateLimitResult): {
  success: false;
  error: string;
  message: string;
  retryAfterSeconds: number;
} {
  return {
    success: false,
    error: 'rate_limit_exceeded',
    message: result.message || 'You have exceeded your rate limit. Please try again later.',
    retryAfterSeconds: result.resetInSeconds || 60,
  };
}
```

---

## PASTE 3 of 3: Integrate into Edge Function

**Instruction for Bolt:**
> In `supabase/functions/generate-report/index.ts`, make these changes:
>
> 1. Add this import near the top (after the other service imports):
> ```typescript
> import { RateLimitService, createRateLimitResponse } from './services/rateLimit.ts';
> ```
>
> 2. RIGHT AFTER creating the supabase client (around line 738, after `supabase = createClient(supabaseUrl, supabaseServiceKey);`), ADD this rate limit check:
> ```typescript
>     // Check rate limit before processing
>     if (userId) {
>       const rateLimitService = new RateLimitService(supabase);
>       const rateLimitResult = await rateLimitService.checkLimit(userId);
>       
>       if (!rateLimitResult.allowed) {
>         console.log(`[AI] Rate limit exceeded for user ${userId}`);
>         return new Response(
>           JSON.stringify(createRateLimitResponse(rateLimitResult)),
>           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
>         );
>       }
>       
>       // Record this request
>       await rateLimitService.recordRequest(userId, customerId);
>     }
> ```

---

## ✅ PHASE 4 COMPLETE

**What this does:**
- Each user gets 20 AI requests per hour, 100 per day
- Friendly message when limit is reached
- Automatic cleanup of old records

**Test by:**
1. Make several AI requests
2. Check the `ai_rate_limits` table in Supabase to see records
3. Optionally lower the limits temporarily to test the rejection message

**Deploy:**
```bash
supabase functions deploy generate-report
```

---

## Ready for Phase 5?
Phase 5 extracts context compilation into a separate service (code cleanup, ~180 lines removed from main file).
