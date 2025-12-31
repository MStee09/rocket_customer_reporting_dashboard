# How Go Rocket's AI Report Studio Works
## A Plain-English Guide for Admins

---

## The Big Picture (30-Second Version)

Imagine you hired a new analyst who:
1. Knows logistics terminology
2. Can look at your database
3. Remembers what each customer cares about
4. Builds reports by asking questions and checking data

That's what the AI does. But instead of a person, it's Claude (from Anthropic) connected to your Supabase database with some guardrails.

---

## How It Actually Works (Step by Step)

### What Happens When a User Asks a Question

```
User types: "Which carriers are driving up my costs?"
                    ↓
        [1. THE REQUEST GOES TO THE EDGE FUNCTION]
                    ↓
        [2. THE AI LOADS CONTEXT]
           - Who is this customer?
           - Are they admin or customer? (determines what data they can see)
           - What fields exist in the database?
           - Any customer-specific terminology?
                    ↓
        [3. THE AI USES "TOOLS" TO INVESTIGATE]
           - Explores the "carrier_name" field (how many carriers? good data?)
           - Previews a grouping (carrier by cost - does it make sense?)
           - Checks if the customer has special terms
                    ↓
        [4. THE AI BUILDS THE REPORT PIECE BY PIECE]
           - Adds a stat row for total cost
           - Adds a bar chart of cost by carrier
           - Sets a meaningful name
                    ↓
        [5. THE AI FINALIZES AND RETURNS]
           - Validates the report will work
           - Sends back JSON that the frontend renders
                    ↓
        User sees a working report
```

### The "Tools" - What the AI Can Actually Do

Think of tools like hands for the AI. Without them, it can only talk. With them, it can actually DO things:

| Tool | What It Does | Why It Matters |
|------|--------------|----------------|
| `explore_field` | Looks at a database column | "Is carrier_name 80% populated or 10%?" |
| `preview_grouping` | Tests a chart before building | "Will grouping by carrier give 5 bars or 500?" |
| `get_customer_context` | Loads customer-specific info | "This customer calls Cargoglide 'CG'" |
| `suggest_visualization` | Picks best chart type | "Time data = line chart, few categories = pie" |
| `add_report_section` | Adds a chart/table/stat | Building the actual report |
| `set_report_metadata` | Names the report, sets theme | Finishing touches |
| `finalize_report` | Marks it done | Validation and completion |

### The Conversation Loop

The AI doesn't just answer once - it can go back and forth:

```
Round 1: AI explores the "carrier_name" field
         → Learns there are 12 carriers with good data coverage

Round 2: AI previews carrier by cost grouping
         → Sees top carrier is 40% of total cost

Round 3: AI adds a stat row and bar chart
         → Report is taking shape

Round 4: AI sets report name and finalizes
         → Done!
```

This loop can run up to 8 times for complex requests.

---

## The Knowledge System - How the AI "Remembers"

### Three Types of Knowledge

```
┌─────────────────────────────────────────────────┐
│           GLOBAL KNOWLEDGE                      │
│  (Applies to ALL customers)                     │
│                                                 │
│  Examples:                                      │
│  • "LTL" = Less Than Truckload                  │
│  • "SCAC" = Standard Carrier Alpha Code         │
│  • "CPM" = Cost Per Mile                        │
│                                                 │
│  Admin action: Add in AI Intelligence page      │
│  with scope = "Global"                          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│        CUSTOMER-SPECIFIC KNOWLEDGE              │
│  (Only for one customer)                        │
│                                                 │
│  Examples:                                      │
│  • Acme calls Cargoglide products "CG"          │
│  • Beta Corp's "West Region" = CA, OR, WA, AZ   │
│  • Gamma Inc's fiscal year starts in July       │
│                                                 │
│  Admin action: Edit customer profile OR         │
│  add in AI Intelligence with scope = customer   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│           LEARNED KNOWLEDGE                     │
│  (AI picked up from conversations)              │
│                                                 │
│  Examples:                                      │
│  • User corrected "CG" means Cargoglide         │
│  • User always wants bar charts descending      │
│  • User prefers weekly over monthly views       │
│                                                 │
│  Admin action: Review in "Needs Review" tab     │
│  → Approve, Reject, or Edit                     │
└─────────────────────────────────────────────────┘
```

### How Knowledge Flows Into AI

When the AI gets a request, it:

1. **Loads the schema** - What database columns exist
2. **Loads global knowledge** - Terms everyone uses
3. **Loads customer knowledge** - This customer's specific terms
4. **Checks access level** - Admin sees cost/margin, customers don't

All of this goes into the "system prompt" - the instructions the AI reads before answering.

---

## Admin Responsibilities - Keeping Knowledge Clean

### Daily/Weekly Tasks

#### 1. Review "Needs Review" Items
**Where:** AI Intelligence page → "Needs Review" tab

**What you're looking at:**
- Items the AI learned automatically from conversations
- Items that have been corrected (the AI got something wrong)
- Low-confidence items

**What to do:**
- ✅ **Approve** if it's correct → Becomes trusted knowledge
- ❌ **Reject** if it's wrong → Gets removed
- ✏️ **Edit** if it's close but needs fixing → Correct it then approve

#### 2. Monitor "Global Promotion Suggestions"
**Where:** AI Intelligence page → scroll to bottom

**What you're looking at:**
- Terms that multiple customers use the same way
- Example: 3 customers all use "hot shipment" to mean expedited

**What to do:**
- If the term is universal, click "Promote to Global"
- Now all customers benefit from that knowledge

### Monthly Tasks

#### 3. Review Customer Profiles
**Where:** Knowledge Base → Profiles tab → Click a customer

**What to check:**
- **Priorities**: Are they still accurate? (cost reduction, speed, etc.)
- **Products**: Any new product lines to add?
- **Key Markets**: Has their geography changed?
- **Terminology**: Any new terms they're using?

**Why it matters:**
- The AI uses this to personalize responses
- "Show me my California performance" works better if the AI knows CA is a key market

#### 4. Check Stats Dashboard
**Where:** AI Intelligence page → top stats cards

**What to look for:**
- **Total Active**: How many knowledge items exist
- **Accuracy %**: Are users correcting the AI often?
- **Auto-Learned**: Is the AI picking up new terms?

**Red flags:**
- Accuracy below 85% → AI is making mistakes, review recent items
- No new learned items → Learning system might not be working
- Many items in "Needs Review" → You're falling behind

---

## Practical Examples

### Example 1: Customer Uses a Nickname

**Situation:** Acme Corp always calls their Cargoglide products "CG"

**User asks:** "Show me CG shipments last month"

**Without knowledge:** AI doesn't know what CG means, might ask for clarification or guess wrong

**With knowledge:** AI translates "CG" → filters description contains "Cargoglide"

**How to set up:**
1. Go to customer profile for Acme Corp
2. Under "Terminology", add:
   - Term: `CG`
   - Meaning: `Cargoglide truck bed slides`
   - AI Instructions: `When user says CG, filter the description field for "Cargoglide"`

### Example 2: Customer Has Special Priorities

**Situation:** Beta Corp cares deeply about on-time delivery to their East Coast customers

**User asks:** "How are we doing?"

**Without profile:** AI might show generic overview (total shipments, revenue)

**With profile:** AI emphasizes on-time % to East Coast states, highlights any issues

**How to set up:**
1. Go to customer profile for Beta Corp
2. Under "Priorities", add: `On-time delivery`, `East Coast performance`
3. Under "Key Markets", add: `NY`, `NJ`, `PA`, `MA`

### Example 3: Promoting Learned Knowledge

**Situation:** AI learned from 3 different customers that "hot" means expedited

**Admin notices:** In "Global Promotion Suggestions" - "hot" appears

**What to do:**
1. Review the suggestion - do all 3 customers mean the same thing?
2. If yes, click "Promote to Global"
3. Now ALL customers can say "show me hot shipments" and it works

---

## Security - What the AI Can and Can't See

### Customer Users (Non-Admin)
**CAN see:**
- Retail (what customer pays)
- Shipment details (origin, destination, weight, etc.)
- Carrier names
- Dates and counts

**CANNOT see:**
- Cost (what Go Rocket pays carriers)
- Margin (profit)
- Carrier pay rates

**Why:** These are sensitive business details. The AI is instructed to suggest alternatives if a customer asks about costs.

### Admin Users
**CAN see:** Everything

**The AI knows the difference** based on the `isAdmin` flag passed with each request.

---

## Troubleshooting Common Issues

### "The AI doesn't understand our terminology"
**Fix:** Add it to the customer's profile or to global knowledge
**Check:** Is the term spelled the same way the customer uses it?

### "The AI keeps suggesting wrong chart types"
**Fix:** The AI learns from usage. If user prefers bar charts, they'll start appearing more
**Check:** Is there a preference stored that's wrong? Edit it in the knowledge base.

### "A customer says the AI got something wrong"
**Fix:** 
1. Check "Needs Review" for corrections
2. If the correction is there, approve or edit it
3. If not, add the correct knowledge manually

### "The AI is too slow"
**Fix:** Usually means the AI is doing many tool calls
**Check:** Complex questions take more "rounds" - this is normal for detailed requests

### "The AI says a field doesn't exist"
**Fix:** 
1. Check `schema_columns` table - is the field listed?
2. Check if it's marked as `admin_only` - customer might not have access
3. Might be a new field that needs to be added to the schema

---

## Quick Reference: Where to Do What

| Task | Where to Go |
|------|-------------|
| Review learned terms | AI Intelligence → Needs Review tab |
| Add global terminology | AI Intelligence → Add Knowledge (scope: Global) |
| Add customer terminology | Customer Profile → Terminology section |
| Define customer products | Customer Profile → Products section |
| Set customer priorities | Customer Profile → Priorities section |
| Promote term to global | AI Intelligence → Global Promotion Suggestions |
| See AI usage stats | AI Intelligence → Stats cards at top |
| Check what AI sees | Click "View" on any knowledge item |

---

## Summary

**The AI is like a smart assistant that:**
1. Looks before it leaps (explores data before building reports)
2. Speaks your customer's language (uses stored terminology)
3. Respects security boundaries (customers can't see costs)
4. Gets smarter over time (learns from corrections)

**Your job as admin:**
1. Review what the AI learns (approve good stuff, reject bad stuff)
2. Keep customer profiles updated (priorities, products, terms)
3. Promote shared knowledge to global (save everyone time)
4. Monitor accuracy (catch problems early)

The cleaner your knowledge base, the smarter your AI becomes.
