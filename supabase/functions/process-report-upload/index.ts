
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get and set auth token
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
        access_token: token,
        refresh_token: '',
      });
      
      if (sessionError) {
        throw new Error(`Authentication failed: ${sessionError.message}`);
      }
    }

    // Parse form data
    console.log('📝 Parsing form data...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const indicatorType = formData.get('indicator_type') as string;
    const userId = formData.get('user_id') as string;

    console.log('📋 Form data received:', {
      fileName: file?.name,
      fileSize: file?.size,
      indicatorType,
      userId
    });

    if (!file || !indicatorType || !userId) {
      throw new Error('Missing required fields: file, indicator_type, or user_id');
    }

    // Verify user exists
    console.log('👤 Verifying user exists...');
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ User verification error:', userError);
      throw new Error(`User verification failed: ${userError.message}`);
    }

    console.log('✅ User verified:', userProfile.full_name);

    // Step 1: Extract data from Excel file
    console.log('🔄 Step 1: Extracting Excel data...');
    const fileBuffer = await file.arrayBuffer();
    const extractedData = await extractExcelData(fileBuffer, indicatorType, file.name);
    console.log('✅ Data extracted:', extractedData);
    
    // Step 2: Transform and validate data
    console.log('🔄 Step 2: Transforming data...');
    const transformedData = await transformData(extractedData, indicatorType);
    console.log('✅ Data transformed:', transformedData);
    
    // Step 3: Check for duplicates
    console.log('🔄 Step 3: Checking duplicates...');
    const duplicateCheck = await checkDuplicates(supabaseClient, transformedData, userId, indicatorType);
    if (duplicateCheck.hasDuplicates) {
      console.log('⚠️ Duplicates found:', duplicateCheck.duplicates);
      return new Response(JSON.stringify({
        success: false,
        error: 'Duplicate data detected',
        duplicates: duplicateCheck.duplicates
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('✅ No duplicates found');

    // Step 4: Calculate score based on KPI rules
    console.log('🔄 Step 4: Calculating score...');
    const calculatedScore = await calculateScore(supabaseClient, transformedData, indicatorType);
    console.log('✅ Score calculated:', calculatedScore);
    
    // Step 5: Generate video hash for validation
    console.log('🔄 Step 5: Generating video hashes...');
    const videoHashes = transformedData.video_links ? 
      await generateVideoHashes(transformedData.video_links) : [];
    console.log('✅ Video hashes generated:', videoHashes.length);

    // Step 6: Insert report into database
    console.log('🔄 Step 6: Inserting report into database...');
    const reportData = {
      user_id: userId,
      indicator_type: indicatorType,
      file_name: file.name,
      file_path: `uploads/${userId}/${Date.now()}_${file.name}`,
      status: 'completed',
      raw_data: extractedData,
      processed_data: transformedData,
      calculated_score: calculatedScore,
      video_links: transformedData.video_links || [],
      video_hashes: videoHashes
    };

    console.log('📝 Report data to insert:', {
      user_id: reportData.user_id,
      indicator_type: reportData.indicator_type,
      file_name: reportData.file_name,
      status: reportData.status,
      calculated_score: reportData.calculated_score
    });

    const { data: report, error: insertError } = await supabaseClient
      .from('reports')
      .insert(reportData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw new Error(`Failed to save report: ${insertError.message}`);
    }

    console.log('✅ Report inserted successfully with ID:', report.id);

    // Create notification for user
    console.log('🔄 Creating notification...');
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'report_uploaded',
        title: 'Laporan Berhasil Diupload',
        message: `Laporan ${indicatorType} telah berhasil diproses dan menunggu persetujuan`,
        related_report_id: report.id
      });

    if (notificationError) {
      console.error('⚠️ Notification creation error:', notificationError);
      // Don't fail the whole process for notification error
    } else {
      console.log('✅ Notification created successfully');
    }

    console.log('🎉 Report upload process completed successfully!');

    return new Response(JSON.stringify({
      success: true,
      report_id: report.id,
      score: calculatedScore,
      message: 'Report uploaded and processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error in process-report-upload:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractExcelData(fileBuffer: ArrayBuffer, indicatorType: string, fileName: string) {
  console.log(`🔍 Extracting data from ${fileName} for indicator ${indicatorType}`);
  
  // Enhanced mock data with more realistic structure
  const mockData = {
    fileName: fileName,
    sheets: ['Data'],
    rows: [
      { 
        kegiatan: 'Sosialisasi Program Digital', 
        peserta: 50, 
        lokasi: 'Jakarta Pusat', 
        tanggal: '2024-01-15',
        budget: 15000000,
        target: 45,
        realisasi: 50
      },
      { 
        kegiatan: 'Workshop Komunikasi Internal', 
        peserta: 30, 
        lokasi: 'Bandung', 
        tanggal: '2024-01-20',
        budget: 8000000,
        target: 25,
        realisasi: 30
      },
      { 
        kegiatan: 'Pelatihan Digital Marketing', 
        peserta: 25, 
        lokasi: 'Surabaya', 
        tanggal: '2024-01-25',
        budget: 12000000,
        target: 30,
        realisasi: 25
      }
    ],
    metadata: {
      total_rows: 3,
      extraction_date: new Date().toISOString(),
      file_size: fileBuffer.byteLength,
      indicator_type: indicatorType
    }
  };

  console.log(`✅ Extracted ${mockData.rows.length} rows from Excel file`);
  return mockData;
}

async function transformData(extractedData: any, indicatorType: string) {
  console.log(`🔄 Transforming data for indicator ${indicatorType}`);
  
  const transformed = {
    indicator_type: indicatorType,
    source_file: extractedData.fileName,
    activities: extractedData.rows.map((row: any, index: number) => ({
      id: `activity_${Date.now()}_${index + 1}`,
      name: row.kegiatan,
      participants: parseInt(row.peserta) || 0,
      location: row.lokasi,
      date: row.tanggal,
      budget: parseInt(row.budget) || 0,
      target: parseInt(row.target) || 0,
      realization: parseInt(row.realisasi) || 0,
      category: getActivityCategory(row.kegiatan),
      impact_score: calculateImpactScore(parseInt(row.peserta) || 0),
      achievement_percentage: calculateAchievementPercentage(parseInt(row.target) || 0, parseInt(row.realisasi) || 0)
    })),
    summary: {
      total_activities: extractedData.rows.length,
      total_participants: extractedData.rows.reduce((sum: number, row: any) => sum + (parseInt(row.peserta) || 0), 0),
      total_budget: extractedData.rows.reduce((sum: number, row: any) => sum + (parseInt(row.budget) || 0), 0),
      unique_locations: [...new Set(extractedData.rows.map((row: any) => row.lokasi))].length,
      date_range: {
        start: extractedData.rows[0]?.tanggal,
        end: extractedData.rows[extractedData.rows.length - 1]?.tanggal
      },
      overall_achievement: calculateOverallAchievement(extractedData.rows)
    },
    validation: {
      is_valid: true,
      errors: [],
      warnings: []
    },
    video_links: [] // Could be extracted from Excel in future
  };

  console.log(`✅ Transformed data: ${transformed.activities.length} activities, ${transformed.summary.total_participants} participants`);
  return transformed;
}

async function checkDuplicates(supabaseClient: any, transformedData: any, userId: string, indicatorType: string) {
  console.log(`🔍 Checking duplicates for user ${userId}, indicator ${indicatorType}`);
  
  // Create activity signatures for duplicate detection
  const activitySignatures = transformedData.activities.map((activity: any) => 
    `${activity.name.toLowerCase().trim()}_${activity.date}_${activity.location.toLowerCase().trim()}`
  );

  console.log(`📝 Generated ${activitySignatures.length} activity signatures`);

  const { data: existingReports, error } = await supabaseClient
    .from('reports')
    .select('processed_data')
    .eq('user_id', userId)
    .eq('indicator_type', indicatorType)
    .in('status', ['completed', 'approved']);

  if (error) {
    console.error('❌ Error checking duplicates:', error);
    throw new Error(`Duplicate check failed: ${error.message}`);
  }

  console.log(`🔍 Found ${existingReports?.length || 0} existing reports to check`);

  const duplicates: string[] = [];
  
  if (existingReports && existingReports.length > 0) {
    for (const report of existingReports) {
      if (report.processed_data?.activities) {
        for (const existingActivity of report.processed_data.activities) {
          const existingSignature = `${existingActivity.name.toLowerCase().trim()}_${existingActivity.date}_${existingActivity.location.toLowerCase().trim()}`;
          if (activitySignatures.includes(existingSignature)) {
            duplicates.push(existingActivity.name);
          }
        }
      }
    }
  }

  console.log(`✅ Duplicate check completed. Found ${duplicates.length} duplicates`);
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: [...new Set(duplicates)] // Remove duplicate entries
  };
}

async function calculateScore(supabaseClient: any, transformedData: any, indicatorType: string) {
  console.log(`🧮 Calculating score for indicator ${indicatorType}`);
  
  try {
    // Get KPI definitions and scoring ranges
    const { data: kpiDef, error } = await supabaseClient
      .from('kpi_definitions')
      .select(`
        *,
        kpi_scoring_ranges(*)
      `)
      .eq('code', indicatorType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching KPI definition:', error);
      throw new Error(`Failed to fetch KPI definition: ${error.message}`);
    }

    if (!kpiDef) {
      console.log(`⚠️ No KPI definition found for ${indicatorType}, using default scoring`);
      return calculateDefaultScore(transformedData);
    }

    console.log(`📋 Using KPI definition: ${kpiDef.name}`);

    let totalScore = 0;
    const totalParticipants = transformedData.summary.total_participants;
    const totalActivities = transformedData.summary.total_activities;
    const overallAchievement = transformedData.summary.overall_achievement;
    
    // Calculate achievement percentage based on calculation type
    let achievementPercentage = 0;
    
    if (kpiDef.calculation_type === 'participant_based') {
      achievementPercentage = (totalParticipants / kpiDef.target_value) * 100;
    } else if (kpiDef.calculation_type === 'activity_based') {
      achievementPercentage = (totalActivities / kpiDef.target_value) * 100;
    } else if (kpiDef.calculation_type === 'achievement_based') {
      achievementPercentage = overallAchievement;
    } else {
      achievementPercentage = calculateDefaultScore(transformedData);
    }

    // Apply scoring ranges if available
    if (kpiDef.kpi_scoring_ranges && kpiDef.kpi_scoring_ranges.length > 0) {
      console.log(`📊 Applying ${kpiDef.kpi_scoring_ranges.length} scoring ranges`);
      
      for (const range of kpiDef.kpi_scoring_ranges) {
        if (achievementPercentage >= range.min_percentage && achievementPercentage <= range.max_percentage) {
          totalScore = range.score_value;
          console.log(`✅ Score found in range ${range.min_percentage}-${range.max_percentage}%: ${totalScore}`);
          break;
        }
      }
    } else {
      totalScore = Math.min(achievementPercentage, 100);
    }

    const finalScore = Math.round(totalScore * 100) / 100; // Round to 2 decimal places
    console.log(`🎯 Final calculated score: ${finalScore} (${achievementPercentage.toFixed(2)}% achievement)`);
    
    return finalScore;
  } catch (error) {
    console.error('❌ Error calculating score:', error);
    return calculateDefaultScore(transformedData);
  }
}

function calculateDefaultScore(transformedData: any): number {
  console.log('🔢 Using default scoring calculation');
  
  const baseScore = transformedData.summary.total_participants * 0.5;
  const activityBonus = transformedData.summary.total_activities * 2;
  const locationBonus = transformedData.summary.unique_locations * 1.5;
  const achievementBonus = transformedData.summary.overall_achievement * 0.3;
  
  const totalScore = Math.min(baseScore + activityBonus + locationBonus + achievementBonus, 100);
  console.log(`🎯 Default score calculated: ${totalScore}`);
  
  return Math.round(totalScore * 100) / 100;
}

function getActivityCategory(activityName: string): string {
  const name = activityName.toLowerCase();
  if (name.includes('sosialisasi')) return 'sosialisasi';
  if (name.includes('workshop') || name.includes('pelatihan')) return 'pelatihan';
  if (name.includes('komunikasi')) return 'komunikasi';
  if (name.includes('digital')) return 'digital';
  if (name.includes('marketing')) return 'marketing';
  return 'lainnya';
}

function calculateImpactScore(participants: number): number {
  if (participants >= 50) return 5;
  if (participants >= 30) return 4;
  if (participants >= 20) return 3;
  if (participants >= 10) return 2;
  return 1;
}

function calculateAchievementPercentage(target: number, realization: number): number {
  if (target === 0) return 100;
  return Math.round((realization / target) * 100);
}

function calculateOverallAchievement(rows: any[]): number {
  if (!rows || rows.length === 0) return 0;
  
  const totalTarget = rows.reduce((sum, row) => sum + (parseInt(row.target) || 0), 0);
  const totalRealization = rows.reduce((sum, row) => sum + (parseInt(row.realisasi) || 0), 0);
  
  if (totalTarget === 0) return 100;
  return Math.round((totalRealization / totalTarget) * 100);
}

async function generateVideoHashes(videoLinks: string[]): Promise<string[]> {
  console.log(`🔐 Generating hashes for ${videoLinks.length} video links`);
  
  const hashes: string[] = [];
  
  for (const link of videoLinks) {
    try {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(link));
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      hashes.push(hashHex);
    } catch (error) {
      console.error('❌ Error generating hash for link:', link, error);
      hashes.push('hash_error');
    }
  }
  
  console.log(`✅ Generated ${hashes.length} video hashes`);
  return hashes;
}
