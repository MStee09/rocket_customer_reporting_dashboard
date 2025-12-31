import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useRef } from 'react';
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
  viewingAsCustomerId: number | null;
  setViewingAsCustomerId: (customerId: number | null) => void;
  isViewingAsCustomer: boolean;
  viewingCustomer: { customer_id: number; company_name: string } | null;
  impersonatingCustomerId: number | null;
  setImpersonatingCustomerId: (customerId: number | null) => void;
  isImpersonating: boolean;
  impersonatingCustomer: { customer_id: number; company_name: string } | null;
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
  const loadingUserIdRef = useRef<string | null>(null);

  const loadUserRole = async (userId: string) => {
    if (loadingUserIdRef.current === userId) {
      console.log('[AuthContext] Already loading role for:', userId);
      return;
    }
    loadingUserIdRef.current = userId;
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
    } finally {
      loadingUserIdRef.current = null;
    }
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect mounting');
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log('[AuthContext] getSession result:', { hasUser: !!session?.user, userId: session?.user?.id });
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserRole(session.user.id);
      }
      if (isMounted) {
        console.log('[AuthContext] Setting isLoading to false');
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return;
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserRole(session.user.id);
        } else {
          loadingUserIdRef.current = null;
          setRole(null);
          setCustomers([]);
          setSelectedCustomerIdState(null);
          localStorage.removeItem(SELECTED_CUSTOMER_KEY);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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

  const setViewingAsCustomerId = async (customerId: number | null) => {
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

  const setImpersonatingCustomerId = async (customerId: number | null) => {
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
    if (impersonatingCustomerId !== null) return false;
    return role?.is_admin ?? false;
  };

  const isCustomer = () => role?.is_customer ?? false;

  const customerIds = useMemo(() => customers.map(c => c.customer_id), [customers]);
  const hasMultipleCustomers = customers.length > 1;

  const isViewingAsCustomer = role?.is_admin === true && viewingAsCustomerId !== null && impersonatingCustomerId === null;
  const viewingCustomer = useMemo(() => {
    if (!isViewingAsCustomer || !viewingAsCustomerId) return null;
    const customer = customers.find(c => c.customer_id === viewingAsCustomerId);
    return customer ? { customer_id: viewingAsCustomerId, company_name: customer.customer_name } : null;
  }, [isViewingAsCustomer, viewingAsCustomerId, customers]);

  const isImpersonating = role?.is_admin === true && impersonatingCustomerId !== null;
  const impersonatingCustomer = useMemo(() => {
    if (!isImpersonating || !impersonatingCustomerId) return null;
    const customer = customers.find(c => c.customer_id === impersonatingCustomerId);
    return customer ? { customer_id: impersonatingCustomerId, company_name: customer.customer_name } : null;
  }, [isImpersonating, impersonatingCustomerId, customers]);

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
