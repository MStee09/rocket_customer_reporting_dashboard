# The Investigator - Simple Setup Instructions

## You Have 2 Files:

1. **BOLT_PASTE_INVESTIGATOR.tsx** - The code for Bolt
2. **SUPABASE_SQL_INVESTIGATOR.sql** - The database stuff for Supabase

---

## Step 1: Bolt Code

1. Open your project in Bolt
2. Tell Bolt:
   ```
   Create these files with the code from BOLT_PASTE_INVESTIGATOR.tsx:
   
   - src/ai/investigator/types.ts (FILE 1)
   - src/ai/investigator/tools.ts (FILE 2)  
   - src/ai/investigator/clientService.ts (FILE 3)
   - src/ai/investigator/index.ts (FILE 4)
   - src/hooks/useInvestigator.ts (FILE 5)
   - src/components/ai/InvestigatorStudio.tsx (FILE 6)
   ```

3. Or just paste the whole file and ask Bolt to split it into the separate files

---

## Step 2: Use the Component

To actually SEE the Investigator, you need to use it somewhere. 

**Option A: Replace your existing AI page**

In your existing AI Studio page (probably `src/pages/AIReportStudioPage.tsx` or similar), import and use the component:

```tsx
import { InvestigatorStudio } from '../components/ai/InvestigatorStudio';

// Then use it like:
<InvestigatorStudio
  customerId={effectiveCustomerId}
  customerName={effectiveCustomerName}
  isAdmin={isAdmin}
  userId={user?.id}
  userEmail={user?.email}
/>
```

**Option B: Ask Bolt to add it**

Tell Bolt:
```
Add the InvestigatorStudio component to my AI Report Studio page.
Import it from '../components/ai/InvestigatorStudio' and replace the 
existing chat interface with it. Pass in the customer context from useAuth.
```

---

## Step 3: SQL (Do This After Bolt Code Works)

1. Go to Supabase → SQL Editor
2. Click "New Query"
3. Copy/paste everything from `SUPABASE_SQL_INVESTIGATOR.sql`
4. Click "Run"
5. You should see "Investigator SQL functions installed successfully!"

---

## That's It!

The Investigator should now appear wherever you added it. It will:
- Show an orange brain icon
- Have 3 modes: Investigate, Build Report, Deep Analysis
- Display tool calls and insights as you chat

---

## If Something Breaks

**"Cannot find module" errors:**
- Make sure all files are in the right folders
- The folder structure should be:
  ```
  src/
    ai/
      investigator/
        types.ts
        tools.ts
        clientService.ts
        index.ts
    hooks/
      useInvestigator.ts
    components/
      ai/
        InvestigatorStudio.tsx
  ```

**"supabase is not defined":**
- The clientService.ts imports from `../../lib/supabase`
- Make sure your supabase client is exported from that location
- If it's somewhere else, update the import path

**Component doesn't show:**
- Make sure you actually rendered `<InvestigatorStudio ... />` somewhere
- Check that you're passing the required props (customerId, isAdmin)
