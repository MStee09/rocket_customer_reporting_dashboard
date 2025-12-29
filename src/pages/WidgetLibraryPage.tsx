import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  Plus,
  Lock,
  Wrench,
  Users as UsersIcon,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { WidgetLibraryCard } from '../components/widgets/WidgetLibraryCard';
import { WidgetInspectorModal } from '../components/widgets/WidgetInspectorModal';
import { CloneToSystemModal } from '../components/widgets/CloneToSystemModal';
import { DeleteWidgetModal } from '../components/widgets/DeleteWidgetModal';
import EditWidgetModal from '../components/widgets/EditWidgetModal';
import { useWidgetsByTab } from '../hooks/useWidgetsByTab';
import { useSupabase } from '../hooks/useSupabase';
import { deleteCustomWidget, saveCustomWidget } from '../config/widgets/customWidgetStorage';

type TabId = 'system' | 'admin_custom' | 'customer_created' | 'my_widgets';

interface Tab {
  id: TabId;
  label: string;
  description: string;
  icon: any;
}

export const WidgetLibraryPage = () => {
  const navigate = useNavigate();
  const { isAdmin, effectiveCustomerId, user, isViewingAsCustomer, viewingCustomer } = useAuth();
  const supabase = useSupabase();
  const currentUserId = user?.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('system');
  const [selectedWidget, setSelectedWidget] = useState<any>(null);
  const [widgetToClone, setWidgetToClone] = useState<any>(null);
  const [widgetToDelete, setWidgetToDelete] = useState<any>(null);
  const [widgetToEdit, setWidgetToEdit] = useState<any>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const { widgets: allWidgets, loading, refetch } = useWidgetsByTab(activeTab);

  const tabs: Tab[] = [
    {
      id: 'system',
      label: 'System Widgets',
      description: isAdmin() && !isViewingAsCustomer
        ? 'Built-in admin widgets (cannot be edited)'
        : 'Built-in widgets available to everyone',
      icon: Lock,
    },
    ...(isAdmin() && !isViewingAsCustomer ? [
      {
        id: 'admin_custom' as TabId,
        label: 'Admin Custom',
        description: 'Widgets created by admins',
        icon: Wrench,
      },
      {
        id: 'customer_created' as TabId,
        label: 'Customer Created',
        description: 'Widgets created by customers (view-only)',
        icon: UsersIcon,
      },
    ] : []),
    ...(!isAdmin() || isViewingAsCustomer ? [
      {
        id: 'my_widgets' as TabId,
        label: isViewingAsCustomer && viewingCustomer
          ? `${viewingCustomer.company_name}'s Widgets`
          : 'My Widgets',
        description: isViewingAsCustomer
          ? 'Widgets created by this customer'
          : 'Widgets you have created',
        icon: Wrench,
      },
    ] : []),
  ];

  const handleDeleteClick = (widget: any) => {
    setWidgetToDelete(widget);
    setSelectedWidget(null);
  };

  const handleConfirmDelete = async () => {
    if (!widgetToDelete) return;

    setDeleteError(null);
    setDeleteSuccess(false);
    setIsDeleting(true);

    try {
      const result = await deleteCustomWidget(
        supabase,
        widgetToDelete.id,
        effectiveCustomerId || undefined
      );

      if (result.success) {
        setDeleteSuccess(true);
        setWidgetToDelete(null);
        refetch();
        setTimeout(() => setDeleteSuccess(false), 3000);
      } else {
        setDeleteError(result.error || 'Failed to delete widget');
        setWidgetToDelete(null);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete widget');
      setWidgetToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (widget: any) => {
    setWidgetToEdit(widget);
    setSelectedWidget(null);
  };

  const handleEditSuccess = (updatedWidget: any) => {
    setWidgetToEdit(null);
    setEditSuccess(true);
    refetch();
    setTimeout(() => setEditSuccess(false), 3000);
  };

  const handleDuplicateClick = async (widget: any) => {
    setSelectedWidget(null);
    setDuplicateError(null);

    try {
      const newWidgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const duplicatedWidget = {
        ...widget,
        id: newWidgetId,
        name: `${widget.name} (Copy)`,
        createdBy: {
          userId: user?.id || '',
          userEmail: user?.email || '',
          isAdmin: isAdmin(),
          customerId: effectiveCustomerId,
          timestamp: new Date().toISOString(),
        },
        visibility: { type: 'private' as const },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      const result = await saveCustomWidget(
        supabase,
        duplicatedWidget,
        effectiveCustomerId || undefined
      );

      if (result.success) {
        setDuplicateSuccess(true);
        refetch();
        setTimeout(() => setDuplicateSuccess(false), 3000);
      } else {
        setDuplicateError(result.error || 'Failed to duplicate widget');
        setTimeout(() => setDuplicateError(null), 5000);
      }
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate widget');
      setTimeout(() => setDuplicateError(null), 5000);
    }
  };

  const filteredWidgets = useMemo(() => {
    if (!searchQuery) return allWidgets;

    return allWidgets.filter(widget => {
      const query = searchQuery.toLowerCase();
      const matchesName = widget.name.toLowerCase().includes(query);
      const matchesDesc = widget.description?.toLowerCase().includes(query);
      return matchesName || matchesDesc;
    });
  }, [allWidgets, searchQuery]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {deleteSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Widget deleted successfully
        </div>
      )}
      {editSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Widget updated successfully
        </div>
      )}
      {duplicateSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Widget duplicated successfully
        </div>
      )}
      {deleteError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {deleteError}
        </div>
      )}
      {duplicateError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {duplicateError}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/analytics')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Analytics"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Widget Library</h1>
            <p className="text-slate-600">
              Browse and manage dashboard widgets
              {isAdmin() && ' • Admin View'}
            </p>
          </div>
        </div>
        {isAdmin() && activeTab !== 'customer_created' && (
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Widget
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 mb-6">
        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600">
              {tabs.find(t => t.id === activeTab)?.description}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 text-sm text-slate-500">
            Showing {filteredWidgets.length} widget{filteredWidgets.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredWidgets.map(widget => (
          <WidgetLibraryCard
            key={widget.id}
            widget={widget}
            isAdmin={isAdmin()}
            isCustomerCreated={activeTab === 'customer_created'}
            isAdminCustom={activeTab === 'admin_custom'}
            currentUserId={currentUserId}
            onClick={() => setSelectedWidget(widget)}
          />
        ))}
      </div>

      {filteredWidgets.length === 0 && (
        <div className="text-center py-16">
          <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No widgets found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery
              ? 'Try adjusting your search'
              : 'No widgets available in this category'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {selectedWidget && (
        <WidgetInspectorModal
          widget={selectedWidget}
          isAdmin={isAdmin()}
          isCustomerCreatedTab={activeTab === 'customer_created'}
          onClose={() => setSelectedWidget(null)}
          onCloneToSystem={
            isAdmin() && activeTab === 'customer_created'
              ? () => {
                  setWidgetToClone(selectedWidget);
                  setSelectedWidget(null);
                }
              : undefined
          }
          onAddToDashboard={(widgetId) => {
            setSelectedWidget(null);
          }}
          onEdit={(widget) => {
            handleEditClick(widget);
          }}
          onDuplicate={(widget) => {
            handleDuplicateClick(widget);
          }}
          onDelete={(widgetId) => {
            const widget = allWidgets.find(w => w.id === widgetId);
            if (widget) handleDeleteClick(widget);
          }}
        />
      )}

      {widgetToDelete && (
        <DeleteWidgetModal
          widget={widgetToDelete}
          onClose={() => setWidgetToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {widgetToClone && (
        <CloneToSystemModal
          widget={widgetToClone}
          onClose={() => setWidgetToClone(null)}
          onSuccess={(newWidgetId) => {
            setWidgetToClone(null);
            alert(`Widget cloned successfully! New ID: ${newWidgetId}`);
          }}
        />
      )}

      {widgetToEdit && (
        <EditWidgetModal
          widget={widgetToEdit}
          onClose={() => setWidgetToEdit(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default WidgetLibraryPage;
