import { SupabaseClient } from '@supabase/supabase-js';
import { CustomWidgetDefinition } from './customWidgetTypes';

const BUCKET = 'custom-widgets';

const getSystemWidgetPath = (widgetId: string) => `system/${widgetId}.json`;
const getAdminWidgetPath = (widgetId: string) => `admin/${widgetId}.json`;
const getCustomerWidgetPath = (customerId: number, widgetId: string) =>
  `customer/${customerId}/${widgetId}.json`;

export const saveCustomWidget = async (
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  customerId?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const path = customerId
      ? getCustomerWidgetPath(customerId, widget.id)
      : getAdminWidgetPath(widget.id);

    console.log('=== STORAGE SAVE DEBUG ===');
    console.log('Bucket:', BUCKET);
    console.log('Path:', path);
    console.log('Customer ID:', customerId);
    console.log('Widget ID:', widget.id);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, JSON.stringify(widget, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    console.log('✅ Widget saved to storage successfully!');
    console.log('=== END STORAGE DEBUG ===');

    return { success: true };
  } catch (err) {
    console.error('❌ Failed to save custom widget:', err);
    return { success: false, error: String(err) };
  }
};

export const loadCustomWidget = async (
  supabase: SupabaseClient,
  widgetId: string,
  isAdmin: boolean,
  customerId?: number
): Promise<CustomWidgetDefinition | null> => {
  if (customerId) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(getCustomerWidgetPath(customerId, widgetId));

      if (!error && data) {
        return JSON.parse(await data.text());
      }
    } catch {
    }
  }

  if (isAdmin) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(getAdminWidgetPath(widgetId));

      if (!error && data) {
        return JSON.parse(await data.text());
      }
    } catch {
    }
  }

  return null;
};

export const loadSystemWidgets = async (
  supabase: SupabaseClient
): Promise<CustomWidgetDefinition[]> => {
  const widgets: CustomWidgetDefinition[] = [];

  try {
    const { data: systemFiles } = await supabase.storage
      .from(BUCKET)
      .list('system');

    for (const file of systemFiles || []) {
      if (file.name.endsWith('.json')) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .download(`system/${file.name}`);

        if (data) {
          widgets.push(JSON.parse(await data.text()));
        }
      }
    }

    return widgets;
  } catch (err) {
    console.error('Failed to load system widgets:', err);
    return [];
  }
};

export const loadAllCustomWidgets = async (
  supabase: SupabaseClient,
  isAdmin: boolean,
  customerId?: number
): Promise<CustomWidgetDefinition[]> => {
  const widgets: CustomWidgetDefinition[] = [];

  try {
    console.log('=== LOAD WIDGETS DEBUG ===');
    console.log('Is Admin:', isAdmin);
    console.log('Customer ID:', customerId);

    const systemWidgets = await loadSystemWidgets(supabase);
    console.log('System widgets loaded:', systemWidgets.length);
    // Validate system widgets before adding
    widgets.push(...systemWidgets.filter(w => w && w.id && w.name && w.type));

    if (isAdmin) {
      const { data: adminFiles, error: adminError } = await supabase.storage
        .from(BUCKET)
        .list('admin');

      console.log('Admin files:', adminFiles?.length || 0, 'Error:', adminError);

      for (const file of adminFiles || []) {
        if (file.name.endsWith('.json')) {
          try {
            const { data, error: downloadError } = await supabase.storage
              .from(BUCKET)
              .download(`admin/${file.name}`);

            if (downloadError) {
              console.warn(`Skipping admin widget ${file.name}: ${downloadError.message}`);
              continue;
            }

            if (data) {
              const widget = JSON.parse(await data.text());
              // Validate widget has required properties
              if (!widget || !widget.id || !widget.name || !widget.type) {
                console.warn(`Invalid widget structure in admin/${file.name}, skipping`);
                continue;
              }
              widgets.push(widget);
            }
          } catch (error) {
            console.warn(`Failed to load admin widget ${file.name}:`, error);
          }
        }
      }
    }

    if (customerId) {
      const folderPath = `customer/${customerId}`;
      console.log('Loading from folder:', folderPath);

      // Get customer name from database
      const { data: customerData } = await supabase
        .from('customer')
        .select('company_name')
        .eq('customer_id', customerId)
        .maybeSingle();

      const customerName = customerData?.company_name || `Customer ${customerId}`;
      console.log('Customer name:', customerName);

      const { data: customerFiles, error: customerError } = await supabase.storage
        .from(BUCKET)
        .list(folderPath);

      console.log('Customer files found:', customerFiles?.length || 0, 'Error:', customerError);
      console.log('Files:', customerFiles);

      for (const file of customerFiles || []) {
        if (file.name.endsWith('.json')) {
          console.log('Loading file:', file.name);
          try {
            const { data, error: downloadError } = await supabase.storage
              .from(BUCKET)
              .download(`${folderPath}/${file.name}`);

            if (downloadError) {
              console.warn(`Skipping ${file.name}: ${downloadError.message}`);
              continue;
            }

            if (data) {
              const widget = JSON.parse(await data.text());

              // Validate widget has required properties
              if (!widget || !widget.id || !widget.name || !widget.type) {
                console.warn(`Invalid widget structure in ${file.name}, skipping`);
                continue;
              }

              // Override customer name with fresh data from database
              if (widget.createdBy) {
                widget.createdBy.customerName = customerName;
                widget.createdBy.customerId = customerId;
              }

              console.log('Widget loaded:', widget.name, 'ID:', widget.id, 'Customer:', customerName);
              widgets.push(widget);
            }
          } catch (error) {
            console.warn(`Failed to load widget file ${file.name}:`, error);
          }
        }
      }
    }

    console.log('Total widgets before filtering:', widgets.length);

    const filtered = widgets.filter(widget => {
      // Admins see everything
      if (isAdmin) return true;

      const viz = widget.visibility;
      
      // System widgets are always visible
      if (viz.type === 'system') return true;
      
      // Admin-only widgets hidden from non-admins
      if (viz.type === 'admin_only') return false;
      
      // Widgets visible to all customers
      if (viz.type === 'all_customers') return true;
      
      // Widgets for specific customers
      if (viz.type === 'specific_customers' && customerId) {
        return viz.customerIds.includes(customerId);
      }
      
      // Customer-specific widgets
      if (viz.type === 'customer_specific' && customerId) {
        return (viz as any).targetCustomerId === customerId;
      }
      
      // Private widgets - check if created BY or FOR this customer
      // FIX: The original logic compared userId (UUID string) to customerId (number) - that never matches!
      // Now we check the createdBy.customerId which is the numeric customer ID
      if (viz.type === 'private' && customerId) {
        // Check if widget was created for this customer
        if (widget.createdBy.customerId === customerId) return true;
        // Also allow if the widget is in this customer's folder (loaded from customer/{customerId}/)
        // This is implicitly true since we're loading from that folder
        return true;
      }

      return false;
    });

    console.log('Widgets after filtering:', filtered.length);
    console.log('=== END LOAD DEBUG ===');

    return filtered;
  } catch (err) {
    console.error('❌ Failed to load custom widgets:', err);
    return [];
  }
};

export const loadAllCustomerCreatedWidgets = async (
  supabase: SupabaseClient
): Promise<CustomWidgetDefinition[]> => {
  const widgets: CustomWidgetDefinition[] = [];

  try {
    const { data: customerFolders } = await supabase.storage
      .from(BUCKET)
      .list('customer');

    for (const folder of customerFolders || []) {
      if (folder.id) {
        const { data: customerFiles } = await supabase.storage
          .from(BUCKET)
          .list(`customer/${folder.name}`);

        for (const file of customerFiles || []) {
          if (file.name.endsWith('.json')) {
            const { data } = await supabase.storage
              .from(BUCKET)
              .download(`customer/${folder.name}/${file.name}`);

            if (data) {
              widgets.push(JSON.parse(await data.text()));
            }
          }
        }
      }
    }

    return widgets;
  } catch (err) {
    console.error('Failed to load customer-created widgets:', err);
    return [];
  }
};

export const deleteCustomWidget = async (
  supabase: SupabaseClient,
  widgetId: string,
  customerId?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const path = customerId
      ? getCustomerWidgetPath(customerId, widgetId)
      : getAdminWidgetPath(widgetId);

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Failed to delete custom widget:', err);
    return { success: false, error: String(err) };
  }
};

export const duplicateCustomerWidgetToAdmin = async (
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  adminUserId: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string; newWidgetId?: string }> => {
  try {
    const newWidgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const duplicatedWidget: CustomWidgetDefinition = {
      ...widget,
      id: newWidgetId,
      name: `${widget.name} (Copy)`,
      createdBy: {
        userId: adminUserId,
        userEmail: adminEmail,
        isAdmin: true,
        timestamp: new Date().toISOString(),
      },
      visibility: {
        type: 'admin_only',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    const result = await saveCustomWidget(supabase, duplicatedWidget);

    if (result.success) {
      return { success: true, newWidgetId };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error('Failed to duplicate customer widget to admin:', err);
    return { success: false, error: String(err) };
  }
};
