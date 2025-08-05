import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = "https://vzpyamvunnhlzypzdbpf.supabase.co";
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ETL Functions
function extractExcelData(rawData: any) {
  console.log('Extracting Excel data...');
  
  if (!rawData || !Array.isArray(rawData)) {
    throw new Error('Invalid raw data format');
  }

  const headers = rawData[0];
  const dataRows = rawData.slice(1);
  
  // Validate required columns
  const requiredColumns = ['Indikator', 'Target', 'Realisasi', 'Link Video'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  return dataRows.map((row: any[], index: number) => {
    const rowData: any = {};
    headers.forEach((header: string, colIndex: number) => {
      rowData[header] = row[colIndex];
    });
    rowData._rowIndex = index + 2; // +2 because Excel is 1-indexed and we skip header
    return rowData;
  });
}

function transformData(extractedData: any[], indicatorType: string) {
  console.log('Transforming data...');
  
  return extractedData.map((row: any) => {
    const target = parseFloat(row['Target']) || 0;
    const realisasi = parseFloat(row['Realisasi']) || 0;
    const videoLink = row['Link Video'];
    
    // Validate video link format
    if (videoLink && !videoLink.toString().includes('sharepoint.com')) {
      console.warn(`Invalid video link format at row ${row._rowIndex}: ${videoLink}`);
    }
    
    return {
      indicator: row['Indikator'],
      target,
      realisasi,
      videoLink,
      rowIndex: row._rowIndex,
      percentage: target > 0 ? (realisasi / target) * 100 : 0
    };
  });
}

async function generateVideoHashes(transformedData: any[]) {
  console.log('Generating video hashes...');
  
  // TODO: Implement Microsoft Graph API integration for real video hash generation
  // For now, using mock implementation
  return transformedData.map((item: any) => {
    if (item.videoLink) {
      // Mock hash generation - replace with actual video download and SHA-256 hashing
      const mockHash = `mock_hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        ...item,
        videoHash: mockHash
      };
    }
    return item;
  });
}

async function checkDuplicates(processedData: any[], currentReportId: string) {
  console.log('Checking for duplicates...');
  
  const videoHashes = processedData
    .filter(item => item.videoHash)
    .map(item => item.videoHash);
  
  if (videoHashes.length === 0) {
    return { hasDuplicates: false, duplicates: [] };
  }
  
  const { data: existingReports, error } = await supabase
    .from('reports')
    .select('id, video_hashes')
    .neq('id', currentReportId)
    .not('video_hashes', 'is', null);
  
  if (error) {
    console.error('Error checking duplicates:', error);
    throw new Error('Failed to check duplicates');
  }
  
  const duplicates: any[] = [];
  
  for (const report of existingReports || []) {
    const existingHashes = report.video_hashes || [];
    const commonHashes = videoHashes.filter(hash => 
      existingHashes.includes(hash)
    );
    
    if (commonHashes.length > 0) {
      duplicates.push({
        reportId: report.id,
        duplicateHashes: commonHashes
      });
    }
  }
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates
  };
}

function calculateScore(processedData: any[]) {
  console.log('Calculating score...');
  
  if (processedData.length === 0) {
    return 0;
  }
  
  const totalPercentage = processedData.reduce((sum, item) => {
    return sum + (item.percentage || 0);
  }, 0);
  
  return Math.round((totalPercentage / processedData.length) * 100) / 100;
}

async function createNotification(userId: string, type: string, title: string, message: string, reportId?: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      related_report_id: reportId
    });
  
  if (error) {
    console.error('Error creating notification:', error);
  }
}

async function processQueuedReports() {
  console.log('Processing queued reports...');
  
  // Get reports that need processing
  const { data: queuedReports, error: fetchError } = await supabase
    .from('reports')
    .select('*')
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: true })
    .limit(5);
  
  if (fetchError) {
    console.error('Error fetching queued reports:', fetchError);
    return;
  }
  
  if (!queuedReports || queuedReports.length === 0) {
    console.log('No queued reports found');
    return;
  }
  
  console.log(`Found ${queuedReports.length} reports to process`);
  
  for (const report of queuedReports) {
    await processReport(report.id);
  }
}

async function processReport(reportId: string) {
  console.log(`Processing report: ${reportId}`);
  
  try {
    // Update status to processing
    const { error: updateError } = await supabase
      .from('reports')
      .update({ status: 'processing' })
      .eq('id', reportId);
    
    if (updateError) {
      console.error('Error updating report status:', updateError);
      return;
    }
    
    // Get report data
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (fetchError || !report) {
      console.error('Error fetching report:', fetchError);
      return;
    }
    
    // Create processing notification
    await createNotification(
      report.user_id,
      'report_processing',
      'Laporan Sedang Diproses',
      `Laporan "${report.file_name}" sedang diproses oleh sistem.`,
      reportId
    );
    
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('report-uploads')
      .download(report.file_path);
    
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }
    
    // Process the file data (assuming it's already parsed in raw_data)
    if (!report.raw_data) {
      throw new Error('No raw data found in report');
    }
    
    // Run ETL pipeline
    const extractedData = extractExcelData(report.raw_data);
    const transformedData = transformData(extractedData, report.indicator_type);
    const processedDataWithHashes = await generateVideoHashes(transformedData);
    
    // Check for duplicates
    const duplicateCheck = await checkDuplicates(processedDataWithHashes, reportId);
    
    if (duplicateCheck.hasDuplicates) {
      // Mark as system rejected due to duplicates
      await supabase
        .from('reports')
        .update({
          status: 'system_rejected',
          rejection_reason: `Duplicate videos found in existing reports: ${duplicateCheck.duplicates.map(d => d.reportId).join(', ')}`
        })
        .eq('id', reportId);
      
      await createNotification(
        report.user_id,
        'report_error',
        'Laporan Ditolak - Video Duplikat',
        `Laporan "${report.file_name}" ditolak karena mengandung video yang sudah pernah digunakan dalam laporan lain.`,
        reportId
      );
      
      return;
    }
    
    // Calculate score
    const calculatedScore = calculateScore(processedDataWithHashes);
    
    // Extract video hashes for storage
    const videoHashes = processedDataWithHashes
      .filter(item => item.videoHash)
      .map(item => item.videoHash);
    
    // Update report with processed data
    const { error: finalUpdateError } = await supabase
      .from('reports')
      .update({
        status: 'pending_approval',
        processed_data: processedDataWithHashes,
        calculated_score: calculatedScore,
        video_hashes: videoHashes
      })
      .eq('id', reportId);
    
    if (finalUpdateError) {
      throw new Error(`Failed to update report: ${finalUpdateError.message}`);
    }
    
    // Create completion notification
    await createNotification(
      report.user_id,
      'report_completed',
      'Laporan Berhasil Diproses',
      `Laporan "${report.file_name}" telah berhasil diproses dan menunggu persetujuan admin.`,
      reportId
    );
    
    console.log(`Successfully processed report: ${reportId}`);
    
  } catch (error) {
    console.error(`Error processing report ${reportId}:`, error);
    
    // Mark as failed
    await supabase
      .from('reports')
      .update({
        status: 'failed',
        rejection_reason: `Processing error: ${error.message}`
      })
      .eq('id', reportId);
    
    // Get report for user notification
    const { data: report } = await supabase
      .from('reports')
      .select('user_id, file_name')
      .eq('id', reportId)
      .single();
    
    if (report) {
      await createNotification(
        report.user_id,
        'report_error',
        'Gagal Memproses Laporan',
        `Terjadi kesalahan saat memproses laporan "${report.file_name}". Silakan coba unggah kembali.`,
        reportId
      );
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, reportId } = await req.json();
    
    console.log(`Worker called with action: ${action}, reportId: ${reportId}`);
    
    if (action === 'process_queued_reports') {
      await processQueuedReports();
      return new Response(
        JSON.stringify({ success: true, message: 'Queued reports processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'process_report' && reportId) {
      await processReport(reportId);
      return new Response(
        JSON.stringify({ success: true, message: 'Report processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action or missing reportId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});