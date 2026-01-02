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
      return { allowed: true };
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