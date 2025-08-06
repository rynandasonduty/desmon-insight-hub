import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalReports: number;
  pendingApproval: number;
  processed: number;
  rejected: number;
  activeSBUs?: number;
  averageScore?: number;
  myReports?: number;
  approved?: number;
  inProcess?: number;
  kpiScore?: number;
}

export const useDashboardStats = (userRole: 'admin' | 'sbu', userId?: string) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        if (userRole === 'admin') {
          // Admin stats - aggregate all reports
          const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('status, calculated_score')
            .order('created_at', { ascending: false });

          if (reportsError) throw reportsError;

          // Count active SBUs
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'sbu')
            .eq('sbu_name', 'not.is.null');

          if (profilesError) throw profilesError;

          const totalReports = reports?.length || 0;
          const pendingApproval = reports?.filter(r => r.status === 'pending_approval').length || 0;
          const processed = reports?.filter(r => r.status === 'approved' && r.calculated_score !== null).length || 0;
          const rejected = reports?.filter(r => r.status === 'rejected').length || 0;
          const activeSBUs = profiles?.length || 0;
          
          // Calculate average score from processed reports
          const processedReports = reports?.filter(r => r.calculated_score !== null) || [];
          const averageScore = processedReports.length > 0 
            ? processedReports.reduce((sum, r) => sum + (r.calculated_score || 0), 0) / processedReports.length
            : 0;

          setStats({
            totalReports,
            pendingApproval,
            processed,
            rejected,
            activeSBUs,
            averageScore: Math.round(averageScore * 10) / 10
          });
        } else {
          // SBU stats - only user's reports
          if (!userId) {
            setStats({
              totalReports: 0,
              pendingApproval: 0,
              processed: 0,
              rejected: 0,
              myReports: 0,
              approved: 0,
              inProcess: 0,
              kpiScore: 0
            });
            return;
          }

          const { data: userReports, error: userReportsError } = await supabase
            .from('reports')
            .select('status, calculated_score')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (userReportsError) throw userReportsError;

          const myReports = userReports?.length || 0;
          const approved = userReports?.filter(r => r.status === 'approved').length || 0;
          const inProcess = userReports?.filter(r => r.status === 'pending_approval' || r.status === 'processing').length || 0;
          const rejected = userReports?.filter(r => r.status === 'rejected').length || 0;
          
          // Calculate user's KPI score
          const userProcessedReports = userReports?.filter(r => r.calculated_score !== null) || [];
          const kpiScore = userProcessedReports.length > 0 
            ? userProcessedReports.reduce((sum, r) => sum + (r.calculated_score || 0), 0) / userProcessedReports.length
            : 0;

          setStats({
            totalReports: myReports,
            pendingApproval: inProcess,
            processed: approved,
            rejected,
            myReports,
            approved,
            inProcess,
            kpiScore: Math.round(kpiScore * 10) / 10
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userRole, userId]);

  return { stats, loading, error };
};