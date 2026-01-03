import { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
}

const DEFAULT_LIMITS: RateLimitConfig = {
  requestsPerMinute: 10,
  requestsPerHour: 60,
  requestsPerDay: 200
};

export class RateLimitService {
  private supabase: SupabaseClient;
  private limits: RateLimitConfig;

  constructor(supabase: SupabaseClient, limits: Partial<RateLimitConfig> = {}) {
    this.supabase = supabase;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  async checkLimit(userId: string): Promise<RateLimitResult> {
    try {
      const { data, error } = await this.supabase.rpc('check_ai_rate_limit', {
        p_user_id: userId,
        p_minute_limit: this.limits.requestsPerMinute,
        p_hour_limit: this.limits.requestsPerHour,
        p_day_limit: this.limits.requestsPerDay
      });

      if (error) {
        console.error('[RateLimit] Check failed:', error);
        return {
          allowed: true,
          remaining: {
            minute: this.limits.requestsPerMinute,
            hour: this.limits.requestsPerHour,
            day: this.limits.requestsPerDay
          }
        };
      }

      return {
        allowed: data.allowed,
        reason: data.reason,
        retryAfterMs: data.retry_after_ms,
        remaining: {
          minute: data.remaining_minute ?? this.limits.requestsPerMinute,
          hour: data.remaining_hour ?? this.limits.requestsPerHour,
          day: data.remaining_day ?? this.limits.requestsPerDay
        }
      };
    } catch (e) {
      console.error('[RateLimit] Exception:', e);
      return {
        allowed: true,
        remaining: {
          minute: this.limits.requestsPerMinute,
          hour: this.limits.requestsPerHour,
          day: this.limits.requestsPerDay
        }
      };
    }
  }

  async recordRequest(userId: string, customerId?: string): Promise<void> {
    try {
      await this.supabase.rpc('record_ai_request', {
        p_user_id: userId,
        p_customer_id: customerId ? parseInt(customerId, 10) : null
      });
    } catch (e) {
      console.error('[RateLimit] Failed to record request:', e);
    }
  }
}

export function createRateLimitResponse(result: RateLimitResult): object {
  return {
    success: false,
    error: 'rate_limit_exceeded',
    message: result.reason || 'Rate limit exceeded. Please try again later.',
    retryAfterMs: result.retryAfterMs,
    remaining: result.remaining,
    report: null,
    toolExecutions: []
  };
}