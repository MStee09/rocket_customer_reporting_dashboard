# Phase 10: Global Content Spacing Fix

## The Problem
Content sits too close to the sidebar on many pages. Each page tries to handle its own padding inconsistently.

## The Solution
Add consistent padding to the main content area in AppLayout, and ensure pages use a proper max-width container.

---

## Option A: Fix at Layout Level (Recommended)

### Update `src/components/AppLayout.tsx`

**Replace the entire file with:**

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { UserCog, Eye, X } from 'lucide-react';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    isViewingAsCustomer,
    viewingCustomer,
    setViewingAsCustomerId,
    isImpersonating,
    impersonatingCustomer,
    setImpersonatingCustomerId,
  } = useAuth();

  const hasBanner = isImpersonating || isViewingAsCustomer;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Impersonation Banner */}
      {isImpersonating && impersonatingCustomer && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
          <UserCog className="w-5 h-5" />
          <span className="font-semibold">
            IMPERSONATING: {impersonatingCustomer.company_name}
          </span>
          <span className="text-amber-100 text-sm hidden sm:inline">
            - You're seeing exactly what this customer sees
          </span>
          <button
            onClick={() => setImpersonatingCustomerId(null)}
            className="flex items-center gap-1 bg-white text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium ml-4"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      )}

      {/* Viewing Banner */}
      {isViewingAsCustomer && viewingCustomer && !isImpersonating && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
          <Eye className="w-4 h-4" />
          <span className="font-medium">
            Viewing data for: {viewingCustomer.company_name}
          </span>
          <span className="text-blue-200 text-sm hidden sm:inline">
            - Admin tools still available
          </span>
          <button
            onClick={() => setViewingAsCustomerId(null)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors text-sm font-medium ml-4"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col overflow-hidden ${hasBanner ? 'pt-10' : ''}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Main content area with proper padding */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

**Key change:** Added `<div className="p-6 lg:p-8">` wrapper around `<Outlet />`.

This gives:
- `p-6` (24px) padding on mobile/tablet
- `p-8` (32px) padding on large screens

---

## Option B: If Option A Breaks Some Pages

Some pages might have their own container styling that conflicts. In that case, update individual pages to remove their own padding and rely on the layout.

### Common page wrapper pattern to REMOVE:

**Before (in individual pages):**
```tsx
<div className="container mx-auto px-4 py-8 max-w-7xl">
```

**After:**
```tsx
<div className="max-w-7xl mx-auto">
```

The `px` and `py` padding now comes from AppLayout.

---

## Pages That Need Individual Updates

If you go with Option A, check these pages and remove redundant padding:

### `src/pages/ReportsHubPage.tsx`
```tsx
// Change from:
<div className="max-w-4xl mx-auto px-6 py-8">

// To:
<div className="max-w-4xl mx-auto">
```

### `src/pages/CustomersPage.tsx`
```tsx
// Change from:
<div className="container mx-auto px-4 py-8 max-w-7xl">

// To:
<div className="max-w-7xl mx-auto">
```

### `src/pages/DashboardPage.tsx`
```tsx
// Change from:
<div className="p-6">

// To:
<div>
```

### `src/pages/ShipmentsPage.tsx`
```tsx
// Check for px-* or py-* classes in the root wrapper and remove them
```

### And so on for other pages...

---

## Quick Find & Replace

Search your codebase for these patterns in page files:

1. `px-4 py-8` → remove
2. `px-6 py-8` → remove  
3. `p-6` (at page root level) → remove
4. `container mx-auto` → just `mx-auto`

---

## Testing Checklist

After applying:

1. [ ] Reports page has proper spacing from sidebar
2. [ ] Dashboard has proper spacing
3. [ ] Customers page has proper spacing
4. [ ] Shipments page has proper spacing
5. [ ] Settings page has proper spacing
6. [ ] Content doesn't feel cramped on any page
7. [ ] Content isn't too far from sidebar either (32px is comfortable)
8. [ ] Mobile still looks good (24px padding)
9. [ ] No double-padding issues (page padding + layout padding)

---

## Visual Result

**Before:**
```
┌─────────┬──────────────────────────────────┐
│ Sidebar │Reports                           │
│         │View and manage...                │
│         │                                  │
└─────────┴──────────────────────────────────┘
           ↑
           Content hugs sidebar
```

**After:**
```
┌─────────┬──────────────────────────────────┐
│ Sidebar │    Reports                       │
│         │    View and manage...            │
│         │                                  │
└─────────┴──────────────────────────────────┘
           ↑
           32px breathing room
```
