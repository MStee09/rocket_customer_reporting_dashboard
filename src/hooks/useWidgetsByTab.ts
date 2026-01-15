import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import {
  loadSystemWidgets,
  loadAllCustomWidgets,
  loadAllCustomerCreatedWidgets,
} from '../config/widgets/customWidgetStorage';
import { CustomWidgetDefinition, WidgetDefinition, customerWidgets, adminWidgets } from '../config/widgets';
import { useAuth } from '../contexts/AuthContext';

type AnyWidget = WidgetDefinition | CustomWidgetDefinition;

export const useWidgetsByTab = (activeTab: string) => {
  const auth = useAuth();
  const {
    effectiveCustomerId,
    isAdmin,
    user,
    isViewingAsCustomer,
  } = auth;

  const customerId = effectiveCustomerId;
  const userId = user?.id;

  const [widgets, setWidgets] = useState<AnyWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const loadWidgets = async () => {
      setLoading(true);
      setError(null);

      logger.log('=== useWidgetsByTab ===');
      logger.log('Active Tab:', activeTab);
      logger.log('Is Admin:', isAdmin());
      logger.log('Is Viewing As Customer:', isViewingAsCustomer);
      logger.log('Effective Customer ID:', customerId);
      logger.log('User ID:', userId);

      try {
        let result: AnyWidget[] = [];

        // SYSTEM WIDGETS TAB
        if (activeTab === 'system') {
          if (isAdmin() && !isViewingAsCustomer) {
            // Admin viewing admin widgets
            result = [
              ...Object.values(adminWidgets),
              ...Object.values(customerWidgets),
            ];
            logger.log('✅ Admin system widgets loaded:', result.length);
          } else {
            // Customer or admin viewing as customer
            result = Object.values(customerWidgets);
            logger.log('✅ Customer system widgets loaded:', result.length);
          }
        }

        // MY WIDGETS TAB (Customer's custom widgets)
        else if (activeTab === 'my_widgets') {
          if (!customerId) {
            logger.log('⚠️ No customer ID for my_widgets');
            result = [];
          } else {
            logger.log('📂 Loading my_widgets for customer:', customerId);

            // Get customer name from database
            const { data: customerData } = await supabase
              .from('customer')
              .select('company_name')
              .eq('customer_id', customerId)
              .maybeSingle();

            const customerName = customerData?.company_name || `Customer ${customerId}`;

            // Load from storage: customer/{customerId}/*.json
            const folderPath = `customer/${customerId}`;
            logger.log('Storage path:', folderPath);
            logger.log('Customer name:', customerName);

            const { data: files, error: listError } = await supabase.storage
              .from('custom-widgets')
              .list(folderPath);

            logger.log('Files found:', files?.length || 0, 'Error:', listError);

            if (listError) {
              console.error('❌ List error:', listError);
              result = [];
            } else if (!files || files.length === 0) {
              logger.log('📭 No widget files in folder');
              result = [];
            } else {
              // Load each JSON file
              const widgets = await Promise.all(
                files
                  .filter(f => f.name.endsWith('.json'))
                  .map(async (file) => {
                    const filePath = `${folderPath}/${file.name}`;
                    logger.log('📥 Downloading:', file.name);

                    try {
                      const { data, error: downloadError } = await supabase.storage
                        .from('custom-widgets')
                        .download(filePath);

                      if (downloadError || !data) {
                        console.error('❌ Download error for', file.name, downloadError);
                        return null;
                      }

                      const text = await data.text();
                      const widget = JSON.parse(text);

                      // Override customer name with fresh data from database
                      if (widget.createdBy) {
                        widget.createdBy.customerName = customerName;
                      }

                      logger.log('✅ Widget loaded:', widget.name, 'ID:', widget.id, 'Customer:', customerName);
                      return widget;
                    } catch (parseError) {
                      console.error('❌ Parse error for', file.name, parseError);
                      return null;
                    }
                  })
              );

              result = widgets.filter(Boolean);
              logger.log('✅ My widgets loaded:', result.length);
            }
          }
        }

        // ADMIN CUSTOM TAB (Admin's custom widgets)
        else if (activeTab === 'admin_custom' && isAdmin() && !isViewingAsCustomer) {
          logger.log('📂 Loading admin custom widgets');

          const allAdminWidgets: CustomWidgetDefinition[] = [];

          const { data: adminFiles, error: listError } = await supabase.storage
            .from('custom-widgets')
            .list('admin');

          logger.log('Admin files/folders found:', adminFiles?.length || 0, 'Error:', listError);

          if (!listError && adminFiles) {
            for (const file of adminFiles) {
              if (!file.name.endsWith('.json')) continue;

              try {
                const { data: widgetData, error: downloadError } = await supabase.storage
                  .from('custom-widgets')
                  .download(`admin/${file.name}`);

                if (downloadError) {
                  console.error('Download error for', file.name, downloadError);
                  continue;
                }

                if (widgetData) {
                  const text = await widgetData.text();
                  const widget = JSON.parse(text);

                  if (!widget.createdBy?.type) {
                    widget.createdBy = {
                      ...widget.createdBy,
                      type: 'admin',
                    };
                  }

                  logger.log('✅ Loaded admin widget:', widget.name, 'by:', widget.createdBy?.userEmail);
                  allAdminWidgets.push(widget);
                }
              } catch (parseError) {
                console.error('Parse error for', file.name, parseError);
              }
            }
          }

          result = allAdminWidgets;
          logger.log('✅ Admin custom widgets loaded:', result.length);
        }

        // CUSTOMER CREATED TAB (All customer widgets for admin to review)
        else if (activeTab === 'customer_created' && isAdmin() && !isViewingAsCustomer) {
          logger.log('📂 Loading all customer-created widgets');

          const allCustomerWidgets: CustomWidgetDefinition[] = [];

          const { data: customerFolders, error: listError } = await supabase.storage
            .from('custom-widgets')
            .list('customer');

          logger.log('Customer folders found:', customerFolders?.length || 0, 'Error:', listError);

          if (!listError && customerFolders) {
            const { data: customers } = await supabase
              .from('customer')
              .select('customer_id, company_name');

            const customerMap = new Map(
              customers?.map(c => [c.customer_id.toString(), c.company_name]) || []
            );

            for (const folder of customerFolders) {
              if (!folder.name) continue;

              const customerId = folder.name;
              const customerName = customerMap.get(customerId) || `Customer ${customerId}`;
              const folderPath = `customer/${folder.name}`;
              logger.log('Loading from folder:', folderPath, 'Customer:', customerName);

              const { data: files, error: filesError } = await supabase.storage
                .from('custom-widgets')
                .list(folderPath);

              logger.log(`Files in ${folderPath}:`, files?.length || 0, 'Error:', filesError);

              if (!files) continue;

              for (const file of files) {
                if (!file.name.endsWith('.json')) continue;

                try {
                  const { data: widgetData, error: downloadError } = await supabase.storage
                    .from('custom-widgets')
                    .download(`${folderPath}/${file.name}`);

                  if (downloadError) {
                    console.error('Download error for', file.name, downloadError);
                    continue;
                  }

                  if (widgetData) {
                    const text = await widgetData.text();
                    const widget = JSON.parse(text);

                    // Override customer name with fresh data from database
                    if (widget.createdBy) {
                      widget.createdBy.customerId = parseInt(customerId);
                      widget.createdBy.customerName = customerName;
                    } else {
                      widget.createdBy = {
                        type: 'customer',
                        customerId: parseInt(customerId),
                        customerName: customerName,
                      };
                    }

                    logger.log('✅ Loaded widget:', widget.name, 'from customer:', widget.createdBy.customerName);
                    allCustomerWidgets.push(widget);
                  }
                } catch (parseError) {
                  console.error('Parse error for', file.name, parseError);
                }
              }
            }
          }

          result = allCustomerWidgets;
          logger.log('✅ Customer-created widgets loaded:', result.length);
        }

        logger.log('🏁 Final widget count:', result.length);
        setWidgets(result);
      } catch (err) {
        console.error('❌ Failed to load widgets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load widgets');
        setWidgets([]);
      } finally {
        setLoading(false);
      }
    };

    loadWidgets();
  }, [activeTab, customerId, isViewingAsCustomer, userId, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { widgets, loading, error, refetch };
};
