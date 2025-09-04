import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';
import { useCurrentAccountPremium } from './useCurrentAccountPremium';
import { supabase } from '@/integrations/supabase/client';

export type FeatureType = 'photo' | 'voice' | 'export';

interface FeatureUsageLimits {
  canUse: (feature: FeatureType) => boolean;
  getRemainingUsage: (feature: FeatureType) => number;
  incrementUsage: (feature: FeatureType) => Promise<boolean>;
  usageData: Record<FeatureType, number>;
  isLoading: boolean;
}

const FEATURE_LIMITS: Record<FeatureType, number> = {
  photo: 3,
  voice: 3,
  export: 3
};

export const useFeatureUsageLimits = (): FeatureUsageLimits => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { isPremium } = useCurrentAccountPremium();
  const [usageData, setUsageData] = useState<Record<FeatureType, number>>({
    photo: 0,
    voice: 0,
    export: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const userId = currentAccount?.id || user?.id;

  const fetchUsageData = async () => {
    if (!userId || isPremium) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: usageRecords, error } = await supabase
        .from('feature_usage')
        .select('feature_type, usage_count')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching usage data:', error);
        setIsLoading(false);
        return;
      }

      const usage: Record<FeatureType, number> = {
        photo: 0,
        voice: 0,
        export: 0
      };

      usageRecords?.forEach((record) => {
        if (record.feature_type in usage) {
          usage[record.feature_type as FeatureType] = record.usage_count;
        }
      });

      setUsageData(usage);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [userId, isPremium]);

  const canUse = (feature: FeatureType): boolean => {
    // Premium users can use everything
    if (isPremium) return true;
    
    // Free users have limits
    return usageData[feature] < FEATURE_LIMITS[feature];
  };

  const getRemainingUsage = (feature: FeatureType): number => {
    if (isPremium) return Infinity;
    return Math.max(0, FEATURE_LIMITS[feature] - usageData[feature]);
  };

  const incrementUsage = async (feature: FeatureType): Promise<boolean> => {
    if (!userId || isPremium) return true;

    if (!canUse(feature)) return false;

    try {
      const newCount = usageData[feature] + 1;

      const { error } = await supabase
        .from('feature_usage')
        .upsert({
          user_id: userId,
          feature_type: feature,
          usage_count: newCount
        }, {
          onConflict: 'user_id,feature_type'
        });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      const newUsageData = {
        ...usageData,
        [feature]: newCount
      };

      setUsageData(newUsageData);
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  return {
    canUse,
    getRemainingUsage,
    incrementUsage,
    usageData,
    isLoading
  };
};