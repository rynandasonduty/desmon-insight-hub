/**
 * Enhanced Reports Hook with Period-based Filtering and Data Immutability
 */

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
  rawData: any;
  processedData: any;
  calculatedScore: number | null;
  fileSize: string;
  videoLinks: string[];
  rejectionReason?: string;
  filePath?: string;
  approvedAt?: string | null;
  user_id?: string;
  // New fields for period tracking
  reportPeriodId?: string;
  reportingMonth?: number;
  reportingYear?: number;
  reportingSemester?: number;
  kpiVersionId?: string;
  isImmutable?: boolean;
  // Period information
  periodName?: string;
  periodType?: string;
}

export interface ReportFilter {
  periodType?: 'monthly' | 'semester' | 'yearly';
  periodStart?: string;
  periodEnd?: string;
  status?: string[];
  indicatorType?: string[];
  sbu?: string[];
  year?: number;
  month?: number;
  semester?: number;
}

export interface ReportPeriod {
  id: string;
  periodType: 'monthly' | 'semester' | 'yearly';
  periodStart: string;
  periodEnd: string;
  periodName: string;
  isActive: boolean;
}

export const useReports = (userRole: 'admin' | 'sbu', userId?: string, filters?: ReportFilter) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try a simple query without joins to test basic connectivity
      console.log('🔍 Testing basic database connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('reports')
        .select('id, file_name, status')
        .limit(1);

      if (testError) {
        console.error('❌ Basic connectivity test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      console.log('✅ Basic connectivity test passed, found', testData?.length, 'records');

      // Try query without profiles join first
      console.log('🔄 Trying query without profiles join...');
      let basicQuery = supabase
        .from('reports')
        .select(`
          id,
          file_name,
          status,
          indicator_type,
          raw_data,
          processed_data,
          calculated_score,
          video_links,
          rejection_reason,
          created_at,
          updated_at,
          approved_at,
          user_id,
          file_path
        `)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (userRole === 'sbu' && userId) {
        console.log('🔒 Applying SBU filter for user:', userId);
        basicQuery = basicQuery.eq('user_id', userId);
      }

      // Apply status filters
      if (filters?.status && filters.status.length > 0) {
        basicQuery = basicQuery.in('status', filters.status);
      }

      // Apply indicator type filters
      if (filters?.indicatorType && filters.indicatorType.length > 0) {
        basicQuery = basicQuery.in('indicator_type', filters.indicatorType);
      }

      const { data: basicData, error: basicError } = await basicQuery;
      
      if (basicError) {
        console.error('❌ Basic query failed:', basicError);
        throw basicError;
      }

      console.log('✅ Basic query successful, found', basicData?.length, 'records');

      // Now try to get user profiles separately
      let profilesData: any = {};
      if (basicData && basicData.length > 0) {
        const userIds = [...new Set(basicData.map(r => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          console.log('🔄 Fetching user profiles for', userIds.length, 'users...');
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, sbu_name')
            .in('id', userIds);
          
          if (profilesError) {
            console.warn('⚠️ Could not fetch profiles:', profilesError);
            // Continue without profiles data
          } else {
            console.log('✅ Profiles fetched successfully:', profiles?.length);
            profilesData = profiles?.reduce((acc: any, profile: any) => {
              acc[profile.id] = profile;
              return acc;
            }, {}) || {};
          }
        }
      }

      const data = basicData;

      // Transform data to match interface
      const transformedReports: Report[] = (data || []).map((report: any) => {
        const userProfile = profilesData[report.user_id];
        return {
        id: report.id,
        fileName: report.file_name,
        submittedBy: userProfile?.full_name || 'Unknown',
        sbu: userProfile?.sbu_name || 'Unknown SBU',
        submittedAt: formatDate(report.created_at),
        status: report.status,
        indicatorType: report.indicator_type,
        rawData: report.raw_data,
        processedData: report.processed_data,
        calculatedScore: report.calculated_score,
        fileSize: '0 KB', // Default since file_size field may not exist
        videoLinks: report.video_links || [],
        rejectionReason: report.rejection_reason,
        filePath: report.file_path,
        approvedAt: report.approved_at ? formatDate(report.approved_at) : null,
        user_id: report.user_id,
        // New fields - set defaults since these fields may not exist
        reportPeriodId: null,
        reportingMonth: null,
        reportingYear: null,
        reportingSemester: null,
        kpiVersionId: null,
        isImmutable: false,
        periodName: null,
        periodType: null
        };
      });

      setReports(transformedReports);
      setTotalCount(data?.length || 0);

    } catch (err) {
      console.error('💥 Error fetching reports:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(`Gagal memuat data laporan: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('report_periods')
        .select('*')
        .eq('is_active', true)
        .order('period_start', { ascending: false });

      if (error) throw error;
      setPeriods(data || []);
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  // Check if report can be modified
  const canModifyReport = (report: Report): boolean => {
    if (userRole === 'admin') {
      return !report.isImmutable && report.status !== 'approved' && report.status !== 'completed';
    }
    return !report.isImmutable && report.status === 'pending_approval' && report.user_id === userId;
  };

  // Get reports by period
  const getReportsByPeriod = async (periodType: 'monthly' | 'semester' | 'yearly', periodName: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey (full_name, sbu_name),
          report_periods!reports_report_period_id_fkey (period_name, period_type)
        `)
        .eq('report_periods.period_type', periodType)
        .eq('report_periods.period_name', periodName);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching reports by period:', err);
      return [];
    }
  };

  // Get period statistics
  const getPeriodStats = async (periodType: 'monthly' | 'semester' | 'yearly', periodName: string) => {
    try {
      const { data, error } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_name', periodName)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching period stats:', err);
      return null;
    }
  };

  // Get available years
  const getAvailableYears = async (): Promise<number[]> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('reporting_year')
        .not('reporting_year', 'is', null);

      if (error) throw error;
      
      const years = [...new Set(data?.map(r => r.reporting_year))].sort((a, b) => b - a);
      return years;
    } catch (err) {
      console.error('Error fetching available years:', err);
      return [];
    }
  };

  // Get available SBUs
  const getAvailableSBUs = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sbu_name')
        .eq('role', 'sbu')
        .not('sbu_name', 'is', null);

      if (error) throw error;
      
      const sbus = [...new Set(data?.map(p => p.sbu_name))].sort();
      return sbus;
    } catch (err) {
      console.error('Error fetching available SBUs:', err);
      return [];
    }
  };

  // Get available indicator types
  const getAvailableIndicatorTypes = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('indicator_type')
        .not('indicator_type', 'is', null);

      if (error) throw error;
      
      const types = [...new Set(data?.map(r => r.indicator_type))].sort();
      return types;
    } catch (err) {
      console.error('Error fetching available indicator types:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchReports();
    fetchPeriods();
  }, [userRole, userId, filters]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('reports_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports'
      }, (payload) => {
        console.log('Real-time update: reports table changed', payload);
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId, filters]);

  return {
    reports,
    loading,
    error,
    totalCount,
    periods,
    canModifyReport,
    getReportsByPeriod,
    getPeriodStats,
    getAvailableYears,
    getAvailableSBUs,
    getAvailableIndicatorTypes,
    refetch: fetchReports
  };
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

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Report actions with immutability checks
export const useReportActions = () => {
  const [loading, setLoading] = useState(false);
  const approveReport = async (reportId: string, adminId: string, notes?: string) => {
    try {
      setLoading(true);
      // Check if report can be modified
      const { data: report } = await supabase
        .from('reports')
        .select('is_immutable, status')
        .eq('id', reportId)
        .single();

      if (report?.is_immutable) {
        throw new Error('Report cannot be modified as it is immutable');
      }

      if (report?.status === 'approved' || report?.status === 'completed') {
        throw new Error('Report is already approved or completed');
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', reportId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error) {
      console.error('Error approving report:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  };

  const rejectReport = async (reportId: string, adminId: string, reason: string) => {
    try {
      setLoading(true);
      // Check if report can be modified
      const { data: report } = await supabase
        .from('reports')
        .select('is_immutable, status')
        .eq('id', reportId)
        .single();

      if (report?.is_immutable) {
        throw new Error('Report cannot be modified as it is immutable');
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          rejected_by: adminId,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', reportId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error) {
      console.error('Error rejecting report:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  };

  return {
    approveReport,
    rejectReport,
    loading
  };
};