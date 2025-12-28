import { User } from '@supabase/supabase-js';

export interface UserRole {
  user_role: 'admin' | 'customer';
  is_admin: boolean;
  is_customer: boolean;
}

export interface CustomerAssociation {
  customer_id: number;
  customer_name: string;
}

export interface AuthState {
  user: User | null;
  role: UserRole | null;
  customers: CustomerAssociation[];
  customerIds: number[];
  selectedCustomerId: number | null;
  hasMultipleCustomers: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}
