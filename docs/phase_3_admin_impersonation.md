# Phase 3: Admin Mode vs Impersonation

## Overview
Create clear visual and functional distinction between:
- **Admin View** (viewing customer data with admin powers)
- **Impersonation** (seeing exactly what customer sees, for debugging)

## Changes Summary
1. Update AdminCustomerSelector with two distinct actions
2. Create distinct visual states for each mode
3. Add impersonation banner that's impossible to miss

---

## File 1: `src/components/AdminCustomerSelector.tsx`

**Replace the entire file with:**

```tsx
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, X, Search, Eye, UserCog, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function AdminCustomerSelector() {
  const { 
    customers, 
    viewingAsCustomerId, 
    setViewingAsCustomerId, 
    isViewingAsCustomer, 
    viewingCustomer,
    impersonatingCustomerId,
    setImpersonatingCustomerId,
    isImpersonating,
    impersonatingCustomer,
  } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleViewCustomer = (customerId: number) => {
    setViewingAsCustomerId(customerId);
    setIsOpen(false);
  };

  const handleImpersonateCustomer = (customerId: number) => {
    setImpersonatingCustomerId(customerId);
    setIsOpen(false);
  };

  const handleExitViewing = () => {
    setViewingAsCustomerId(null);
    setIsOpen(false);
  };

  const handleExitImpersonation = () => {
    setImpersonatingCustomerId(null);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get current mode label
  const getModeLabel = () => {
    if (isImpersonating && impersonatingCustomer) {
      return `Impersonating: ${impersonatingCustomer.company_name}`;
    }
    if (isViewingAsCustomer && viewingCustomer) {
      return `Viewing: ${viewingCustomer.company_name}`;
    }
    return 'Customer View';
  };

  return (
    <>
      {/* Impersonation Banner - Very Prominent */}
      {isImpersonating && impersonatingCustomer && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
          <UserCog className="w-5 h-5" />
          <span className="font-semibold">
            ⚠️ IMPERSONATING: {impersonatingCustomer.company_name}
          </span>
          <span className="text-amber-100 text-sm">
            (Seeing exactly what they see)
          </span>
          <button
            onClick={handleExitImpersonation}
            className="flex items-center gap-1 bg-white text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium ml-4"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      )}

      {/* View Mode Banner - Subtle but visible */}
      {isViewingAsCustomer && viewingCustomer && !isImpersonating && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
          <Eye className="w-4 h-4" />
          <span className="font-medium">
            Viewing data for: {viewingCustomer.company_name}
          </span>
          <span className="text-blue-200 text-sm">
            (Admin tools still available)
          </span>
          <button
            onClick={handleExitViewing}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors text-sm font-medium ml-4"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      )}

      {/* Dropdown Trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
            isImpersonating
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : isViewingAsCustomer
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {isImpersonating ? (
            <UserCog className="w-4 h-4" />
          ) : isViewingAsCustomer ? (
            <Eye className="w-4 h-4" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          <span className="hidden md:inline">{getModeLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-scale-in">
            {/* Exit buttons if in a mode */}
            {(isViewingAsCustomer || isImpersonating) && (
              <div className="px-3 pb-2 mb-2 border-b border-gray-100">
                <button
                  onClick={isImpersonating ? handleExitImpersonation : handleExitViewing}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Shield className="w-4 h-4 text-gray-400" />
                  Return to Admin View
                </button>
              </div>
            )}

            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Section: View Data For */}
            <div className="px-3 py-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                <Eye className="w-3 h-3" />
                View Data For
              </div>
              <p className="text-xs text-gray-500 mb-2">
                See their data with your admin tools
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto px-1">
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No customers found
                </div>
              ) : (
                filteredCustomers.slice(0, 8).map((customer) => (
                  <button
                    key={`view-${customer.customer_id}`}
                    onClick={() => handleViewCustomer(customer.customer_id)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm rounded-lg mx-1 ${
                      viewingAsCustomerId === customer.customer_id && !isImpersonating
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {customer.customer_name}
                  </button>
                ))
              )}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100" />

            {/* Section: Impersonate */}
            <div className="px-3 py-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                <UserCog className="w-3 h-3" />
                Impersonate Customer
              </div>
              <p className="text-xs text-gray-500 mb-2">
                See exactly what they see (for debugging)
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto px-1">
              {filteredCustomers.slice(0, 8).map((customer) => (
                <button
                  key={`impersonate-${customer.customer_id}`}
                  onClick={() => handleImpersonateCustomer(customer.customer_id)}
                  className={`w-full text-left px-3 py-2 hover:bg-amber-50 text-sm rounded-lg mx-1 ${
                    impersonatingCustomerId === customer.customer_id
                      ? 'bg-amber-50 text-amber-600 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {customer.customer_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

---

## File 2: `src/contexts/AuthContext.tsx`

**Replace the entire file with:**

```tsx
import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthState, UserRole, CustomerAssociation } from '../types/auth';
import { validateCustomerSelection } from '../utils/customerValidation';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setSelectedCustomerId: (customerId: number | null) => void;
  isAdmin: () => boolean;
  isCustomer: () => boolean;
  // View mode (admin sees customer data but keeps admin powers)
  viewingAsCustomerId: number | null;
  setViewingAsCustomerId: (customerId: number | null) => void;
  isViewingAsCustomer: boolean;
  viewingCustomer: { customer_id: number; company_name: string } | null;
  // Impersonation mode (admin sees exactly what customer sees)
  impersonatingCustomerId: number | null;
  setImpersonatingCustomerId: (customerId: number | null) => void;
  isImpersonating: boolean;
  impersonatingCustomer: { customer_id: number; company_name: string } | null;
  // Effective values (used for queries)
  effectiveCustomerIds: number[];
  effectiveCustomerId: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SELECTED_CUSTOMER_KEY = 'selectedCustomerId';
const VIEWING_AS_CUSTOMER_KEY = 'rocket_viewing_as_customer';
const IMPERSONATING_CUSTOMER_KEY = 'rocket_impersonating_customer';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [customers, setCustomers] = useState<CustomerAssociation[]>([]);
  const [selectedCustomerId, setSelectedCustomerIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(SELECTED_CUSTOMER_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [viewingAsCustomerId, setViewingAsCustomerIdState] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(VIEWING_AS_CUSTOMER_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [impersonatingCustomerId, setImpersonatingCustomerIdState] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(IMPERSONATING_CUSTOMER_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadUserRole = async (userId: string) => {
    console.log('[AuthContext] Loading user role for:', userId);

    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_role')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('[AuthContext] user_roles query result:', { roleData, roleError });

      if (roleError) {
        console.error('Error loading user role:', roleError);
        setRole({ user_role: 'customer', is_admin: false, is_customer: true });
        setCustomers([]);
        return;
      }

      if (roleData) {
        console.log('[AuthContext] Setting role from user_roles:', roleData);

        const userRole = roleData.user_role || 'customer';
        setRole({
          user_role: userRole,
          is_admin: userRole === 'admin',
          is_customer: userRole === 'customer',
        });

        let loadedCustomers: CustomerAssociation[] = [];

        if (userRole === 'admin') {
          console.log('[AuthContext] Loading all customers for admin');
          const { data: allCustomers, error: customersError } = await supabase
            .from('customer')
            .select('customer_id, company_name')
            .eq('is_active', true)
            .order('company_name');

          console.log('[AuthContext] Admin customers loaded:', { count: allCustomers?.length, error: customersError });

          if (allCustomers) {
            loadedCustomers = allCustomers.map((c: any) => ({
              customer_id: c.customer_id,
              customer_name: c.company_name,
            }));
          }
        } else if (userRole === 'customer') {
          console.log('[AuthContext] Loading customer associations');
          const { data: customerLinks, error: linksError } = await supabase
            .from('users_customers')
            .select('customer_id')
            .eq('user_id', userId);

          console.log('[AuthContext] Customer links loaded:', { links: customerLinks, error: linksError });

          if (customerLinks && customerLinks.length > 0) {
            const customerIds = customerLinks.map(link => link.customer_id);

            const { data: customerData, error: customerError } = await supabase
              .from('customer')
              .select('customer_id, company_name')
              .in('customer_id', customerIds)
              .eq('is_active', true)
              .order('company_name');

            console.log('[AuthContext] Customer data loaded:', { data: customerData, error: customerError });

            if (customerData) {
              loadedCustomers = customerData.map((c: any) => ({
                customer_id: c.customer_id,
                customer_name: c.company_name,
              }));
            }
          }
        }

        console.log('[AuthContext] Setting customers:', loadedCustomers);
        setCustomers(loadedCustomers);

        const storedCustomerId = localStorage.getItem(SELECTED_CUSTOMER_KEY);
        const storedId = storedCustomerId ? parseInt(storedCustomerId, 10) : null;

        if (loadedCustomers.length > 0) {
          const isStoredValid = storedId && loadedCustomers.some(c => c.customer_id === storedId);
          const newSelectedId = isStoredValid ? storedId : loadedCustomers[0].customer_id;
          console.log('[AuthContext] Setting selected customer:', newSelectedId);
          setSelectedCustomerIdState(newSelectedId);
          localStorage.setItem(SELECTED_CUSTOMER_KEY, newSelectedId.toString());
        } else {
          console.log('[AuthContext] No customers found, clearing selection');
          setSelectedCustomerIdState(null);
          localStorage.removeItem(SELECTED_CUSTOMER_KEY);
        }
      } else {
        console.log('[AuthContext] No user role found, defaulting to customer');
        setRole({ user_role: 'customer', is_admin: false, is_customer: true });
        setCustomers([]);
      }
    } catch (error) {
      console.error('[AuthContext] Error in loadUserRole:', error);
      setRole({ user_role: 'customer', is_admin: false, is_customer: true });
      setCustomers([]);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect mounting');

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] getSession result:', { hasUser: !!session?.user, userId: session?.user?.id });
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserRole(session.user.id);
      }
      console.log('[AuthContext] Setting isLoading to false');
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserRole(session.user.id);
        } else {
          setRole(null);
          setCustomers([]);
          setSelectedCustomerIdState(null);
          localStorage.removeItem(SELECTED_CUSTOMER_KEY);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setCustomers([]);
    setSelectedCustomerIdState(null);
    setViewingAsCustomerIdState(null);
    setImpersonatingCustomerIdState(null);
    localStorage.removeItem(SELECTED_CUSTOMER_KEY);
    sessionStorage.removeItem(VIEWING_AS_CUSTOMER_KEY);
    sessionStorage.removeItem(IMPERSONATING_CUSTOMER_KEY);
  };

  const setSelectedCustomerId = (customerId: number | null) => {
    setSelectedCustomerIdState(customerId);
    if (customerId !== null) {
      localStorage.setItem(SELECTED_CUSTOMER_KEY, customerId.toString());
    } else {
      localStorage.removeItem(SELECTED_CUSTOMER_KEY);
    }
  };

  // View mode - admin sees customer data but keeps admin features
  const setViewingAsCustomerId = async (customerId: number | null) => {
    // Clear impersonation if setting view mode
    if (customerId !== null) {
      setImpersonatingCustomerIdState(null);
      sessionStorage.removeItem(IMPERSONATING_CUSTOMER_KEY);
    }

    if (customerId !== null) {
      const customer = customers.find(c => c.customer_id === customerId);
      if (customer) {
        console.log(`[Auth] Setting view customer: ${customer.customer_name} (ID: ${customerId})`);

        const validation = await validateCustomerSelection(customerId, customer.customer_name);
        if (!validation.valid) {
          console.error(`[Auth] Customer validation failed: ${validation.error}`);
        }
      }
    } else {
      console.log('[Auth] Exiting customer view mode');
    }

    setViewingAsCustomerIdState(customerId);
    if (customerId !== null) {
      sessionStorage.setItem(VIEWING_AS_CUSTOMER_KEY, customerId.toString());
    } else {
      sessionStorage.removeItem(VIEWING_AS_CUSTOMER_KEY);
    }
  };

  // Impersonation mode - admin sees exactly what customer sees (no admin features)
  const setImpersonatingCustomerId = async (customerId: number | null) => {
    // Clear view mode if setting impersonation
    if (customerId !== null) {
      setViewingAsCustomerIdState(null);
      sessionStorage.removeItem(VIEWING_AS_CUSTOMER_KEY);
    }

    if (customerId !== null) {
      const customer = customers.find(c => c.customer_id === customerId);
      if (customer) {
        console.log(`[Auth] IMPERSONATING customer: ${customer.customer_name} (ID: ${customerId})`);
      }
    } else {
      console.log('[Auth] Exiting impersonation mode');
    }

    setImpersonatingCustomerIdState(customerId);
    if (customerId !== null) {
      sessionStorage.setItem(IMPERSONATING_CUSTOMER_KEY, customerId.toString());
    } else {
      sessionStorage.removeItem(IMPERSONATING_CUSTOMER_KEY);
    }
  };

  const isAdmin = () => {
    // If impersonating, act as if NOT admin
    if (impersonatingCustomerId !== null) return false;
    return role?.is_admin ?? false;
  };
  
  const isCustomer = () => role?.is_customer ?? false;

  const customerIds = useMemo(() => customers.map(c => c.customer_id), [customers]);
  const hasMultipleCustomers = customers.length > 1;

  // View mode = admin viewing customer data with admin powers
  const isViewingAsCustomer = role?.is_admin === true && viewingAsCustomerId !== null && impersonatingCustomerId === null;
  const viewingCustomer = useMemo(() => {
    if (!isViewingAsCustomer || !viewingAsCustomerId) return null;
    const customer = customers.find(c => c.customer_id === viewingAsCustomerId);
    return customer ? { customer_id: viewingAsCustomerId, company_name: customer.customer_name } : null;
  }, [isViewingAsCustomer, viewingAsCustomerId, customers]);

  // Impersonation mode = admin seeing exactly what customer sees
  const isImpersonating = role?.is_admin === true && impersonatingCustomerId !== null;
  const impersonatingCustomer = useMemo(() => {
    if (!isImpersonating || !impersonatingCustomerId) return null;
    const customer = customers.find(c => c.customer_id === impersonatingCustomerId);
    return customer ? { customer_id: impersonatingCustomerId, company_name: customer.customer_name } : null;
  }, [isImpersonating, impersonatingCustomerId, customers]);

  // Effective customer IDs for queries
  const effectiveCustomerIds = useMemo(() => {
    if (impersonatingCustomerId) return [impersonatingCustomerId];
    if (viewingAsCustomerId) return [viewingAsCustomerId];
    return customerIds;
  }, [impersonatingCustomerId, viewingAsCustomerId, customerIds]);

  const effectiveCustomerId = useMemo(() => {
    if (impersonatingCustomerId) return impersonatingCustomerId;
    if (viewingAsCustomerId) return viewingAsCustomerId;
    return selectedCustomerId;
  }, [impersonatingCustomerId, viewingAsCustomerId, selectedCustomerId]);

  const value = {
    user,
    role,
    customers,
    customerIds,
    selectedCustomerId,
    hasMultipleCustomers,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    setSelectedCustomerId,
    isAdmin,
    isCustomer,
    viewingAsCustomerId,
    setViewingAsCustomerId,
    isViewingAsCustomer,
    viewingCustomer,
    impersonatingCustomerId,
    setImpersonatingCustomerId,
    isImpersonating,
    impersonatingCustomer,
    effectiveCustomerIds,
    effectiveCustomerId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## File 3: Update `src/components/Sidebar.tsx`

**Find the `isViewingAsCustomer` section and add impersonation handling:**

In the Sidebar component, find the viewing banner (around line 127-139) and replace with:

```tsx
{/* Show impersonation or view mode indicator in sidebar */}
{isImpersonating && impersonatingCustomer && (
  <div className="mx-4 mt-4 px-4 py-3 bg-amber-500/20 border border-amber-500/40 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <UserCog className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
        Impersonating
      </span>
    </div>
    <div className="text-sm font-medium text-white">
      {impersonatingCustomer.company_name}
    </div>
  </div>
)}

{isViewingAsCustomer && viewingCustomer && !isImpersonating && (
  <div className="mx-4 mt-4 px-4 py-3 bg-blue-500/20 border border-blue-500/40 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <Eye className="w-4 h-4 text-blue-400" />
      <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
        Viewing
      </span>
    </div>
    <div className="text-sm font-medium text-white">
      {viewingCustomer.company_name}
    </div>
  </div>
)}
```

**Also update the imports at the top:**

```tsx
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Building2, 
  FileText, 
  X, 
  UserCog, 
  Database, 
  Settings, 
  BookOpen, 
  Search, 
  LucideIcon, 
  Bookmark, 
  ChevronDown, 
  Pin, 
  HelpCircle,
  Eye  // Add this
} from 'lucide-react';
```

**And update the useAuth destructure:**

```tsx
const { isAdmin, isViewingAsCustomer, viewingCustomer, isImpersonating, impersonatingCustomer } = useAuth();
```

**And update shouldShowAdmin:**

```tsx
const shouldShowAdmin = isAdmin() && !isViewingAsCustomer && !isImpersonating;
```

Wait - when impersonating, `isAdmin()` returns false, so this should just be:

```tsx
const shouldShowAdmin = isAdmin();
```

---

## Testing Checklist

After applying these changes:

1. [ ] Customer selector dropdown shows two sections: "View Data For" and "Impersonate"
2. [ ] Selecting "View Data For" shows blue banner with customer name
3. [ ] Admin features still visible when viewing
4. [ ] Selecting "Impersonate" shows amber/warning banner
5. [ ] Admin sidebar items HIDDEN when impersonating
6. [ ] Impersonation banner is very prominent (amber, top of screen)
7. [ ] Can exit both modes with clear buttons
8. [ ] Data queries use the effective customer ID in both modes
9. [ ] Session storage persists mode across page refresh
10. [ ] Signing out clears both modes

---

## Notes

- **View Mode**: Admin can see customer's data but still has admin tools. Blue styling.
- **Impersonation**: Admin sees EXACTLY what customer sees. Amber/warning styling. No admin features.
- The `isAdmin()` function now returns `false` when impersonating, which automatically hides admin features throughout the app.
- Both modes clear the other when activated (can't be in both simultaneously)
