import { useState, useEffect, useCallback } from 'react';
import { SavedView } from '../types/customerIntelligence';
import * as savedViewsService from '../services/savedViewsService';
import { useAuth } from '../contexts/AuthContext';

interface UseSavedViewsReturn {
  views: SavedView[];
  pinnedViews: SavedView[];

  isLoading: boolean;
  error: string | null;

  saveView: (data: {
    name: string;
    description?: string;
    viewType: 'shipments' | 'report' | 'dashboard_filter';
    viewConfig: Record<string, any>;
    isPinned?: boolean;
  }) => Promise<SavedView>;

  updateView: (id: string, updates: {
    name?: string;
    description?: string;
    viewConfig?: Record<string, any>;
    isPinned?: boolean;
  }) => Promise<void>;

  deleteView: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSavedViews(): UseSavedViewsReturn {
  const { user, effectiveCustomerId } = useAuth();
  const [views, setViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await savedViewsService.getSavedViews(user.id, effectiveCustomerId ?? undefined);
      setViews(data);
    } catch (err) {
      setError('Failed to load saved views');
      console.error('useSavedViews fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, effectiveCustomerId]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  const pinnedViews = views.filter(v => v.isPinned);

  const saveView = async (data: Parameters<UseSavedViewsReturn['saveView']>[0]) => {
    if (!user?.id) throw new Error('Not authenticated');

    const newView = await savedViewsService.createSavedView({
      userId: user.id,
      customerId: effectiveCustomerId ?? undefined,
      ...data,
      isPinned: data.isPinned ?? false
    });

    await fetchViews();
    return newView;
  };

  const updateView = async (id: string, updates: Parameters<UseSavedViewsReturn['updateView']>[1]) => {
    await savedViewsService.updateSavedView(id, updates);
    await fetchViews();
  };

  const deleteView = async (id: string) => {
    await savedViewsService.deleteSavedView(id);
    await fetchViews();
  };

  const togglePin = async (id: string) => {
    await savedViewsService.togglePin(id);
    await fetchViews();
  };

  return {
    views,
    pinnedViews,
    isLoading,
    error,
    saveView,
    updateView,
    deleteView,
    togglePin,
    refresh: fetchViews
  };
}

export default useSavedViews;
