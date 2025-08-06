import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Report {
  id: string;
  fileName: string;
  submittedBy: string;
  sbu: string;
  submittedAt: string;
  status: string;
  indicatorType: string;
  calculatedScore: number | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  filePath: string | null;
  processedData: any;
  rawData: any;
  videoLinks: any;
  videoHashes: string[] | null;
}

export const useReports = (userRole: 'admin' | 'sbu', userId?: string, currentSBU?: string) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('reports')
        .select(`
          id,
          file_name,
          status,
          indicator_type,
          calculated_score,
          created_at,
          updated_at,
          approved_at,
          rejection_reason,
          file_path,
          processed_data,
          raw_data,
          video_links,
          video_hashes,
          user_profile:profiles!reports_user_id_fkey(full_name, sbu_name),
          approved_by_profile:profiles!reports_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // Filter by user role
      if (userRole === 'sbu' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to match expected interface
      const transformedReports: Report[] = data?.map(report => ({
        id: report.id,
        fileName: report.file_name,
        submittedBy: report.user_profile?.full_name || 'Unknown User',
        sbu: report.user_profile?.sbu_name || currentSBU || 'Unknown SBU',
        submittedAt: formatDate(report.created_at),
        status: report.status,
        indicatorType: report.indicator_type || 'Unknown',
        calculatedScore: report.calculated_score,
        approvedBy: report.approved_by_profile?.full_name || null,
        approvedAt: report.approved_at ? formatDate(report.approved_at) : null,
        rejectionReason: report.rejection_reason,
        filePath: report.file_path,
        processedData: report.processed_data,
        rawData: report.raw_data,
        videoLinks: report.video_links,
        videoHashes: report.video_hashes
      })) || [];

      setReports(transformedReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Set up real-time subscription
    const channel = supabase
      .channel('reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId, currentSBU]);

  return { reports, loading, error, refetch: fetchReports };
};

// Helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Hook for report actions (approve/reject)
export const useReportActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveReport = async (reportId: string, adminId: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Call admin-report-action edge function
      const { error: functionError } = await supabase.functions.invoke('admin-report-action', {
        body: {
          reportId,
          action: 'approve',
          notes
        }
      });

      if (functionError) {
        console.warn('Edge function error (non-critical):', functionError);
      }

      return { success: true };
    } catch (err) {
      console.error('Error approving report:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve report');
      return { success: false, error: err instanceof Error ? err.message : 'Failed to approve report' };
    } finally {
      setLoading(false);
    }
  };

  const rejectReport = async (reportId: string, adminId: string, reason: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          approved_by: adminId,
          rejection_reason: reason,
          approved_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Call admin-report-action edge function
      const { error: functionError } = await supabase.functions.invoke('admin-report-action', {
        body: {
          reportId,
          action: 'reject',
          reason
        }
      });

      if (functionError) {
        console.warn('Edge function error (non-critical):', functionError);
      }

      return { success: true };
    } catch (err) {
      console.error('Error rejecting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject report');
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reject report' };
    } finally {
      setLoading(false);
    }
  };

  return {
    approveReport,
    rejectReport,
    loading,
    error
  };
};