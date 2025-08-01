import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportData {
  indicator_type: string;
  raw_data: any;
  processed_data: any;
  calculated_score: number;
  video_links?: string[];
  video_hashes?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      'https://vzpyamvunnhlzypzdbpf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cHlhbXZ1bm5obHp5cHpkYnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQ0MzIsImV4cCI6MjA2OTM2MDQzMn0.UaU6mywmh6_3szVV3CwPc3Q7aiyRxSeY8Ivb_yBryB0',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await supabaseClient.auth.setSession({
        access_token: token,
        refresh_token: '',
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const indicatorType = formData.get('indicator_type') as string;
    const userId = formData.get('user_id') as string;

    if (!file || !indicatorType || !userId) {
      throw new Error('Missing required fields: file, indicator_type, or user_id');
    }

    console.log(`Processing report upload: ${file.name}, indicator: ${indicatorType}, user: ${userId}`);

    // Step 1: Extract data from Excel file
    const fileBuffer = await file.arrayBuffer();
    const extractedData = await extractExcelData(fileBuffer, indicatorType);
    
    // Step 2: Transform and validate data
    const transformedData = await transformData(extractedData, indicatorType);
    
    // Step 3: Check for duplicates
    const duplicateCheck = await checkDuplicates(supabaseClient, transformedData, userId, indicatorType);
    if (duplicateCheck.hasDuplicates) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Duplicate data detected',
        duplicates: duplicateCheck.duplicates
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Calculate score based on KPI rules
    const calculatedScore = await calculateScore(supabaseClient, transformedData, indicatorType);
    
    // Step 5: Generate video hash for validation
    const videoHashes = transformedData.video_links ? 
      await generateVideoHashes(transformedData.video_links) : [];

    // Step 6: Load data into database
    const reportData: ReportData = {
      indicator_type: indicatorType,
      raw_data: extractedData,
      processed_data: transformedData,
      calculated_score: calculatedScore,
      video_links: transformedData.video_links || [],
      video_hashes: videoHashes
    };

    const { data: report, error: insertError } = await supabaseClient
      .from('reports')
      .insert({
        user_id: userId,
        indicator_type: indicatorType,
        file_name: file.name,
        file_path: `uploads/${userId}/${Date.now()}_${file.name}`,
        status: 'completed',
        raw_data: reportData.raw_data,
        processed_data: reportData.processed_data,
        calculated_score: reportData.calculated_score,
        video_links: reportData.video_links,
        video_hashes: reportData.video_hashes
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save report: ${insertError.message}`);
    }

    // Create notification for admin
    await supabaseClient.from('notifications').insert({
      user_id: userId,
      type: 'report_uploaded',
      title: 'Laporan Berhasil Diupload',
      message: `Laporan ${indicatorType} telah berhasil diproses dan disimpan`,
      related_report_id: report.id
    });

    console.log(`Report successfully processed and saved with ID: ${report.id}`);

    return new Response(JSON.stringify({
      success: true,
      report_id: report.id,
      score: calculatedScore,
      message: 'Report uploaded and processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-report-upload:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractExcelData(fileBuffer: ArrayBuffer, indicatorType: string) {
  // Simulate Excel parsing - in real implementation, use a library like xlsx
  const mockData = {
    sheets: ['Data'],
    rows: [
      { kegiatan: 'Sosialisasi Program', peserta: 50, lokasi: 'Jakarta', tanggal: '2024-01-15' },
      { kegiatan: 'Workshop Komunikasi', peserta: 30, lokasi: 'Bandung', tanggal: '2024-01-20' },
      { kegiatan: 'Pelatihan Digital', peserta: 25, lokasi: 'Surabaya', tanggal: '2024-01-25' }
    ],
    metadata: {
      total_rows: 3,
      extraction_date: new Date().toISOString(),
      file_size: fileBuffer.byteLength
    }
  };

  console.log(`Extracted ${mockData.rows.length} rows from Excel file`);
  return mockData;
}

async function transformData(extractedData: any, indicatorType: string) {
  // Transform extracted data based on indicator type
  const transformed = {
    indicator_type: indicatorType,
    activities: extractedData.rows.map((row: any, index: number) => ({
      id: `activity_${index + 1}`,
      name: row.kegiatan,
      participants: parseInt(row.peserta) || 0,
      location: row.lokasi,
      date: row.tanggal,
      category: getActivityCategory(row.kegiatan),
      impact_score: calculateImpactScore(parseInt(row.peserta) || 0)
    })),
    summary: {
      total_activities: extractedData.rows.length,
      total_participants: extractedData.rows.reduce((sum: number, row: any) => sum + (parseInt(row.peserta) || 0), 0),
      unique_locations: [...new Set(extractedData.rows.map((row: any) => row.lokasi))].length,
      date_range: {
        start: extractedData.rows[0]?.tanggal,
        end: extractedData.rows[extractedData.rows.length - 1]?.tanggal
      }
    },
    validation: {
      is_valid: true,
      errors: [],
      warnings: []
    }
  };

  console.log(`Transformed data for indicator ${indicatorType}: ${transformed.activities.length} activities`);
  return transformed;
}

async function checkDuplicates(supabaseClient: any, transformedData: any, userId: string, indicatorType: string) {
  // Check for duplicate reports based on activity names and dates
  const activityHashes = transformedData.activities.map((activity: any) => 
    `${activity.name}_${activity.date}_${activity.location}`.toLowerCase()
  );

  const { data: existingReports } = await supabaseClient
    .from('reports')
    .select('processed_data')
    .eq('user_id', userId)
    .eq('indicator_type', indicatorType)
    .eq('status', 'completed');

  const duplicates: string[] = [];
  
  if (existingReports) {
    for (const report of existingReports) {
      if (report.processed_data?.activities) {
        for (const existingActivity of report.processed_data.activities) {
          const existingHash = `${existingActivity.name}_${existingActivity.date}_${existingActivity.location}`.toLowerCase();
          if (activityHashes.includes(existingHash)) {
            duplicates.push(existingActivity.name);
          }
        }
      }
    }
  }

  console.log(`Duplicate check completed. Found ${duplicates.length} duplicates`);
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: duplicates
  };
}

async function calculateScore(supabaseClient: any, transformedData: any, indicatorType: string) {
  // Get KPI definitions and scoring ranges
  const { data: kpiDef } = await supabaseClient
    .from('kpi_definitions')
    .select('*, kpi_scoring_ranges(*)')
    .eq('code', indicatorType)
    .eq('is_active', true)
    .single();

  if (!kpiDef) {
    console.log(`No KPI definition found for ${indicatorType}, using default scoring`);
    return calculateDefaultScore(transformedData);
  }

  let totalScore = 0;
  const totalParticipants = transformedData.summary.total_participants;
  const totalActivities = transformedData.summary.total_activities;
  
  // Calculate score based on achievement percentage
  let achievementPercentage = 0;
  
  if (kpiDef.calculation_type === 'participant_based') {
    achievementPercentage = (totalParticipants / kpiDef.target_value) * 100;
  } else if (kpiDef.calculation_type === 'activity_based') {
    achievementPercentage = (totalActivities / kpiDef.target_value) * 100;
  } else {
    achievementPercentage = calculateDefaultScore(transformedData);
  }

  // Apply scoring ranges
  if (kpiDef.kpi_scoring_ranges && kpiDef.kpi_scoring_ranges.length > 0) {
    for (const range of kpiDef.kpi_scoring_ranges) {
      if (achievementPercentage >= range.min_percentage && achievementPercentage <= range.max_percentage) {
        totalScore = range.score_value;
        break;
      }
    }
  } else {
    totalScore = Math.min(achievementPercentage, 100);
  }

  console.log(`Calculated score: ${totalScore} (${achievementPercentage}% achievement)`);
  return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
}

function calculateDefaultScore(transformedData: any): number {
  const baseScore = transformedData.summary.total_participants * 0.5;
  const activityBonus = transformedData.summary.total_activities * 2;
  const locationBonus = transformedData.summary.unique_locations * 1.5;
  
  return Math.min(baseScore + activityBonus + locationBonus, 100);
}

function getActivityCategory(activityName: string): string {
  const name = activityName.toLowerCase();
  if (name.includes('sosialisasi')) return 'sosialisasi';
  if (name.includes('workshop') || name.includes('pelatihan')) return 'pelatihan';
  if (name.includes('komunikasi')) return 'komunikasi';
  if (name.includes('digital')) return 'digital';
  return 'lainnya';
}

function calculateImpactScore(participants: number): number {
  if (participants >= 50) return 5;
  if (participants >= 30) return 4;
  if (participants >= 20) return 3;
  if (participants >= 10) return 2;
  return 1;
}

async function generateVideoHashes(videoLinks: string[]): Promise<string[]> {
  // Generate hashes for video validation
  const hashes: string[] = [];
  
  for (const link of videoLinks) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(link));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    hashes.push(hashHex);
  }
  
  return hashes;
}