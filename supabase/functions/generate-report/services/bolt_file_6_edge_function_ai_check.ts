// File: supabase/functions/generate-report/index.ts
//
// FIND this section (around line 445-468):
/*
      const { data: budgetCheck, error: budgetError } = await supabase.rpc('check_user_daily_budget', {
        p_user_id: userId,
        p_cap: 5.00
      });
      
      if (!budgetError && budgetCheck && !budgetCheck.allowed) {
        ...
      }

      await rateLimitService.recordRequest(userId, customerId);
*/
//
// REPLACE with this updated version that checks if AI is enabled and uses customer-specific cap:

      // Check if AI is enabled for this customer
      if (customerId) {
        const { data: aiEnabled } = await supabase.rpc('is_ai_enabled_for_customer', {
          p_customer_id: parseInt(customerId, 10)
        });
        
        if (aiEnabled === false) {
          console.log(`[AI] AI disabled for customer ${customerId}`);
          return new Response(
            JSON.stringify({
              error: 'ai_disabled',
              message: 'AI features are not enabled for this account. Please contact your administrator.',
              report: null,
              toolExecutions: []
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Get customer-specific daily cap (defaults to $5 if not set)
      let dailyCap = 5.00;
      if (customerId) {
        const { data: capData } = await supabase.rpc('get_customer_daily_cap', {
          p_customer_id: parseInt(customerId, 10)
        });
        if (capData !== null) {
          dailyCap = capData;
        }
      }

      // Check daily budget with customer-specific cap
      const { data: budgetCheck, error: budgetError } = await supabase.rpc('check_user_daily_budget', {
        p_user_id: userId,
        p_cap: dailyCap
      });
      
      if (!budgetError && budgetCheck && !budgetCheck.allowed) {
        console.log(`[AI] Daily budget exceeded for user ${userId}: ${budgetCheck.spent_today} / ${dailyCap}`);
        return new Response(
          JSON.stringify({
            error: 'daily_budget_exceeded',
            message: budgetCheck.message,
            report: null,
            toolExecutions: [],
            usage: {
              spentToday: budgetCheck.spent_today,
              dailyCap: budgetCheck.daily_cap
            }
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await rateLimitService.recordRequest(userId, customerId);
