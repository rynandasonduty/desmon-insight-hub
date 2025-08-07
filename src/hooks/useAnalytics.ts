import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsMetrics {
  totalReports: number;
  approvalRate: number;
  averageScore: number;
  activeSBU: number;
}

export interface LeaderboardItem {
  rank: number;
  sbu: string;
  score: number;
  change: string;
  userId?: string;
}

export interface TrendData {
  month: string;
  total_laporan: number;
  approved: number;
  rejected: number;
}

export interface CompositionData {
  name: string;
  value: number;
  color: string;
}

export interface PerformanceData {
  indicator: string;
  [key: string]: number | string;
}

// Hook for analytics metrics with real-time updates
export const useAnalyticsMetrics = (userRole: 'admin' | 'sbu', userId?: string) => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        if (userRole === 'admin') {
          // Admin: get all reports metrics
          const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('status, calculated_score, user_id');

          if (reportsError) throw reportsError;

          // Count active SBUs
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'sbu')
            .not('sbu_name', 'is', null);

          if (profilesError) throw profilesError;

          const totalReports = reports?.length || 0;
          const approvedReports = reports?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0;
          const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;
          
          const scoredReports = reports?.filter(r => r.calculated_score !== null) || [];
          const averageScore = scoredReports.length > 0 
            ? scoredReports.reduce((sum, r) => sum + (r.calculated_score || 0), 0) / scoredReports.length
            : 0;

          setMetrics({
            totalReports,
            approvalRate: Math.round(approvalRate * 10) / 10,
            averageScore: Math.round(averageScore * 10) / 10,
            activeSBU: profiles?.length || 0
          });
        } else {
          // SBU: get user-specific metrics
          if (!userId) {
            setMetrics({
              totalReports: 0,
              approvalRate: 0,
              averageScore: 0,
              activeSBU: 1
            });
            return;
          }

          const { data: userReports, error: userReportsError } = await supabase
            .from('reports')
            .select('status, calculated_score')
            .eq('user_id', userId);

          if (userReportsError) throw userReportsError;

          const totalReports = userReports?.length || 0;
          const approvedReports = userReports?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0;
          const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;
          
          const scoredReports = userReports?.filter(r => r.calculated_score !== null) || [];
          const averageScore = scoredReports.length > 0 
            ? scoredReports.reduce((sum, r) => sum + (r.calculated_score || 0), 0) / scoredReports.length
            : 0;

          setMetrics({
            totalReports,
            approvalRate: Math.round(approvalRate * 10) / 10,
            averageScore: Math.round(averageScore * 10) / 10,
            activeSBU: 1
          });
        }
      } catch (err) {
        console.error('Error fetching analytics metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Set up real-time subscription for reports
    const reportsChannel = supabase
      .channel('analytics_metrics_reports')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports'
      }, (payload) => {
        console.log('Real-time update: reports table changed', payload);
        fetchMetrics();
      })
      .subscribe();

    // Set up real-time subscription for profiles (for active SBU count)
    const profilesChannel = supabase
      .channel('analytics_metrics_profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: 'role=eq.sbu'
      }, (payload) => {
        console.log('Real-time update: profiles table changed', payload);
        if (userRole === 'admin') {
          fetchMetrics();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [userRole, userId]);

  return { metrics, loading, error };
};

// Hook for leaderboard data with real-time updates
export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all SBU users with their average scores
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            sbu_name,
            reports!reports_user_id_fkey(calculated_score, status)
          `)
          .eq('role', 'sbu')
          .not('sbu_name', 'is', null);

        if (profilesError) throw profilesError;

        // Calculate average scores for each SBU
        const sbuScores = profiles?.map(profile => {
          const reports = profile.reports || [];
          const scoredReports = reports.filter((r: any) => 
            r.calculated_score !== null && (r.status === 'completed' || r.status === 'approved')
          );
          const averageScore = scoredReports.length > 0
            ? scoredReports.reduce((sum: number, r: any) => sum + r.calculated_score, 0) / scoredReports.length
            : 0;

          return {
            sbu: profile.sbu_name || 'Unknown SBU',
            score: Math.round(averageScore * 10) / 10,
            userId: profile.id,
            change: '+0.0' // TODO: Calculate actual change from previous period
          };
        }) || [];

        // Sort by score and add ranks
        const sortedLeaderboard = sbuScores
          .sort((a, b) => b.score - a.score)
          .map((item, index) => ({
            ...item,
            rank: index + 1,
            change: calculateChange(item.userId, item.score) // Calculate actual change
          }));

        setLeaderboard(sortedLeaderboard);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Set up real-time subscription for reports and profiles
    const reportsChannel = supabase
      .channel('leaderboard_reports')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports'
      }, (payload) => {
        console.log('Real-time update: reports table changed for leaderboard', payload);
        fetchLeaderboard();
      })
      .subscribe();

    const profilesChannel = supabase
      .channel('leaderboard_profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: 'role=eq.sbu'
      }, (payload) => {
        console.log('Real-time update: profiles table changed for leaderboard', payload);
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  return { leaderboard, loading, error };
};

// Hook for trend data with real-time updates
export const useTrendData = (userRole: 'admin' | 'sbu', userId?: string) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query based on user role
        let query = supabase
          .from('reports')
          .select('created_at, status');

        if (userRole === 'sbu' && userId) {
          query = query.eq('user_id', userId);
        }

        const { data: reports, error: reportsError } = await query;

        if (reportsError) throw reportsError;

        // Group reports by month
        const monthlyData: { [key: string]: { total: number; approved: number; rejected: number } } = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize last 6 months
        const currentDate = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const monthKey = months[date.getMonth()];
          monthlyData[monthKey] = { total: 0, approved: 0, rejected: 0 };
        }

        // Process reports
        reports?.forEach(report => {
          const date = new Date(report.created_at);
          const monthKey = months[date.getMonth()];
          
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].total++;
            if (report.status === 'approved' || report.status === 'completed') {
              monthlyData[monthKey].approved++;
            } else if (report.status === 'rejected' || report.status === 'system_rejected') {
              monthlyData[monthKey].rejected++;
            }
          }
        });

        // Convert to array format
        const trendArray = Object.entries(monthlyData).map(([month, data]) => ({
          month,
          total_laporan: data.total,
          approved: data.approved,
          rejected: data.rejected
        }));

        setTrendData(trendArray);
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trend data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();

    // Set up real-time subscription
    const channel = supabase
      .channel('trend_data_reports')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports'
      }, (payload) => {
        console.log('Real-time update: reports table changed for trend data', payload);
        fetchTrendData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId]);

  return { trendData, loading, error };
};

// Hook for composition data with real-time updates
export const useCompositionData = (userRole: 'admin' | 'sbu', userId?: string) => {
  const [compositionData, setCompositionData] = useState<CompositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompositionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query based on user role
        let query = supabase
          .from('reports')
          .select('indicator_type');

        if (userRole === 'sbu' && userId) {
          query = query.eq('user_id', userId);
        }

        const { data: reports, error: reportsError } = await query;

        if (reportsError) throw reportsError;

        // Count by indicator type
        const indicatorCounts: { [key: string]: number } = {};
        reports?.forEach(report => {
          const type = report.indicator_type || 'Unknown';
          indicatorCounts[type] = (indicatorCounts[type] || 0) + 1;
        });

        // Convert to composition data format
        const colors = [
          'hsl(var(--primary))',
          'hsl(var(--secondary))',
          'hsl(var(--accent))',
          'hsl(var(--desmon-primary))',
          'hsl(var(--desmon-secondary))'
        ];

        const total = Object.values(indicatorCounts).reduce((sum, count) => sum + count, 0);
        
        const composition = Object.entries(indicatorCounts).map(([name, count], index) => ({
          name: name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: total > 0 ? Math.round((count / total) * 100) : 0,
          color: colors[index % colors.length]
        }));

        setCompositionData(composition);
      } catch (err) {
        console.error('Error fetching composition data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch composition data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompositionData();

    // Set up real-time subscription
    const channel = supabase
      .channel('composition_data_reports')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports'
      }, (payload) => {
        console.log('Real-time update: reports table changed for composition data', payload);
        fetchCompositionData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId]);

  return { compositionData, loading, error };
};

// Add function to calculate actual change from previous period
const calculateChange = (userId: string, currentScore: number): string => {
  // TODO: Implement actual change calculation from previous period
  // This should query historical data and calculate the difference
  // For now, return a placeholder
  return '+0.0';
};