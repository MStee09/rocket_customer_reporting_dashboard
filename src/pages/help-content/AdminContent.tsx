import { Users } from 'lucide-react';
import { Callout, Step } from './HelpComponents';

export function UserManagementContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">User Management</h1>
      <p className="text-lg text-gray-600 mb-6">
        Administrators can add, edit, and manage user accounts from the User Management page.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">User Roles</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Role</th>
              <th className="text-left p-3 border font-semibold">Permissions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rocket-600" />
                  <strong>Admin</strong>
                </div>
              </td>
              <td className="p-3 border">Full access to all features, all customers, and admin settings</td>
            </tr>
            <tr>
              <td className="p-3 border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <strong>Customer</strong>
                </div>
              </td>
              <td className="p-3 border">Access only to assigned customer(s) data, no admin features</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Adding a New User</h2>

      <Step number={1} title="Navigate to User Management">
        Navigate to <strong>Admin</strong> then <strong>User Management</strong>.
      </Step>

      <Step number={2} title="Click Add User">
        Click <strong>Add User</strong>.
      </Step>

      <Step number={3} title="Enter Email">
        Enter email address.
      </Step>

      <Step number={4} title="Select Role">
        Select role (Admin or Customer).
      </Step>

      <Step number={5} title="Assign to Customers">
        If Customer role, assign to specific customer(s).
      </Step>

      <Step number={6} title="Send Invitation">
        Click <strong>Send Invitation</strong>.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Existing Users</h2>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Edit</strong> - Change role or customer assignments</li>
        <li><strong>Disable</strong> - Temporarily block access</li>
        <li><strong>Delete</strong> - Permanently remove the user</li>
        <li><strong>Resend Invitation</strong> - For users who haven't activated</li>
      </ul>

      <Callout type="warning">
        User role changes take effect immediately. Be careful when modifying admin access.
      </Callout>
    </div>
  );
}

export function ImpersonationContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">View As Customer</h1>
      <p className="text-lg text-gray-600 mb-6">
        The "View As" feature lets administrators see the dashboard exactly as a
        specific customer user would see it.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">When to Use</h2>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>Troubleshooting customer-reported issues</li>
        <li>Verifying that customer sees correct data</li>
        <li>Testing customer-specific configurations</li>
        <li>Demonstrating features to customers</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Use</h2>

      <Step number={1} title="Click View As Dropdown">
        Click the <strong>"View as"</strong> dropdown in the header.
      </Step>

      <Step number={2} title="Select Customer">
        Select the customer you want to impersonate.
      </Step>

      <Step number={3} title="Notice the Banner">
        An <strong>orange banner</strong> appears confirming "Viewing as [Customer]".
      </Step>

      <Step number={4} title="Navigate Freely">
        Navigate the dashboard - you'll see exactly what the customer sees.
      </Step>

      <Step number={5} title="Exit When Done">
        Click <strong>"Exit"</strong> in the banner to return to admin view.
      </Step>

      <Callout type="warning">
        While in "View As" mode, you have the same permissions as that customer.
        Admin-only features and other customers' data will be hidden.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What Changes</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Data is filtered to only that customer's shipments</li>
        <li>Admin menu items are hidden</li>
        <li>Reports show only that customer's reports</li>
        <li>Customer Intelligence Profile is applied to AI responses</li>
      </ul>
    </div>
  );
}
