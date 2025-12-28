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
  viewingAsCustomerId: number | null;
  setViewingAsCustomerId: (customerId: number | null) => void;
  isViewingAsCustomer: boolean;
  viewingCustomer: { customer_id: number; company_name: string } | null;
  effectiveCustomerIds: number[];
  effectiveCustomerId: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SELECTED_CUSTOMER_KEY = 'selectedCustomerId';
const VIEWING_AS_CUSTOMER_KEY = 'rocket_viewing_as_customer';

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
            console.log('[AuthContext] Active customers:', loadedCustomers.map(c =>
              `${c.customer_name} (ID: ${c.customer_id})`
            ));
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
    localStorage.removeItem(SELECTED_CUSTOMER_KEY);
    sessionStorage.removeItem(VIEWING_AS_CUSTOMER_KEY);
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
      const customer = customers.find(c => c.customer_id === customerId);
      if (customer) {
        console.log(`[Auth] Setting viewing customer: ${customer.customer_name} (ID: ${customerId})`);

        const validation = await validateCustomerSelection(customerId, customer.customer_name);
        if (!validation.valid) {
          console.error(`[Auth] Customer validation failed: ${validation.error}`);
        }
      } else {
        console.warn(`[Auth] WARNING: Customer ID ${customerId} not found in customer list!`);
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

  const isAdmin = () => role?.is_admin ?? false;
  const isCustomer = () => role?.is_customer ?? false;

  const customerIds = useMemo(() => customers.map(c => c.customer_id), [customers]);
  const hasMultipleCustomers = customers.length > 1;

  const isViewingAsCustomer = isAdmin() && viewingAsCustomerId !== null;
  const viewingCustomer = useMemo(() => {
    if (!isViewingAsCustomer || !viewingAsCustomerId) return null;
    const customer = customers.find(c => c.customer_id === viewingAsCustomerId);
    return customer ? { customer_id: viewingAsCustomerId, company_name: customer.customer_name } : null;
  }, [isViewingAsCustomer, viewingAsCustomerId, customers]);

  const effectiveCustomerIds = useMemo(() => {
    const ids = isViewingAsCustomer && viewingAsCustomerId ? [viewingAsCustomerId] : customerIds;
    if (ids.length > 0) {
      console.log('[Auth] Effective customer IDs for queries:', ids);
    }
    return ids;
  }, [isViewingAsCustomer, viewingAsCustomerId, customerIds]);

  const effectiveCustomerId = useMemo(() => {
    const id = isViewingAsCustomer ? viewingAsCustomerId : selectedCustomerId;
    console.log('[Auth] Effective single customer ID:', id);
    return id;
  }, [isViewingAsCustomer, viewingAsCustomerId, selectedCustomerId]);

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
