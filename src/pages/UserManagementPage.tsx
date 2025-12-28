import { useEffect, useState } from 'react';
import { Users, Edit2, Loader2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateUtils';

interface User {
  id: string;
  email: string;
  created_at: string;
  user_role: 'admin' | 'customer' | null;
  customer_ids: number[];
}

interface Customer {
  customer_id: number;
  company_name: string;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'customer'>('customer');
  const [editCustomers, setEditCustomers] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadUsers(), loadCustomers()]);
    setIsLoading(false);
  };

  const loadUsers = async () => {
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    if (authUsers && authUsers.users) {
      const enrichedUsers = await Promise.all(
        authUsers.users.map(async (authUser) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('user_role')
            .eq('user_id', authUser.id)
            .maybeSingle();

          const { data: customerLinks } = await supabase
            .from('users_customers')
            .select('customer_id')
            .eq('user_id', authUser.id);

          return {
            id: authUser.id,
            email: authUser.email || '',
            created_at: authUser.created_at,
            user_role: roleData?.user_role || null,
            customer_ids: customerLinks?.map(link => link.customer_id) || [],
          };
        })
      );

      setUsers(enrichedUsers);
    }
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customer')
      .select('customer_id, company_name')
      .eq('is_active', true)
      .order('company_name');
    if (data) {
      setCustomers(data);
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditRole(user.user_role || 'customer');
    setEditCustomers(user.customer_ids || []);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditRole('customer');
    setEditCustomers([]);
  };

  const saveUser = async (userId: string) => {
    setIsSaving(true);

    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        await supabase
          .from('user_roles')
          .update({
            user_role: editRole,
            is_admin: editRole === 'admin',
            is_customer: editRole === 'customer'
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            user_role: editRole,
            is_admin: editRole === 'admin',
            is_customer: editRole === 'customer'
          });
      }

      const user = users.find((u) => u.id === userId);
      const oldCustomerIds = user?.customer_ids || [];
      const removedCustomers = oldCustomerIds.filter((id) => !editCustomers.includes(id));
      const addedCustomers = editCustomers.filter((id) => !oldCustomerIds.includes(id));

      for (const customerId of removedCustomers) {
        await supabase
          .from('users_customers')
          .delete()
          .eq('user_id', userId)
          .eq('customer_id', customerId);
      }

      for (const customerId of addedCustomers) {
        await supabase
          .from('users_customers')
          .insert({
            user_id: userId,
            customer_id: customerId,
            created_by: userId
          });
      }

      await loadUsers();
      cancelEdit();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user changes');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCustomer = (customerId: number) => {
    setEditCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
        <p className="text-slate-600 mt-1">Manage user roles and customer access</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const isEditing = editingUserId === user.id;
                const userCustomerNames = customers
                  .filter((c) => user.customer_ids?.includes(c.customer_id))
                  .map((c) => c.company_name);

                return (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-800">{user.email}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as 'admin' | 'customer')}
                          className="px-3 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="customer">Customer</option>
                        </select>
                      ) : user.user_role ? (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            user.user_role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.user_role}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">No role</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="space-y-1">
                          {customers.map((customer) => (
                            <label
                              key={customer.customer_id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editCustomers.includes(customer.customer_id)}
                                onChange={() => toggleCustomer(customer.customer_id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{customer.company_name}</span>
                            </label>
                          ))}
                        </div>
                      ) : userCustomerNames.length > 0 ? (
                        <span className="text-slate-600">{userCustomerNames.join(', ')}</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveUser(user.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-3 py-1 bg-rocket-navy hover:bg-rocket-navy-light text-white text-sm rounded transition-colors disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-3 py-1 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(user)}
                          className="flex items-center gap-1 px-3 py-1 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No users found</p>
            <p className="text-sm text-slate-400 mt-2">
              Users will appear here once they sign up or are invited
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
