import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = "https://vzpyamvunnhlzypzdbpf.supabase.co";
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Definisi kolom yang diperlukan untuk setiap jenis indikator dengan alias
const INDICATOR_CONFIGS = {
  'publikasi-media': {
    requiredColumns: [
      { name: 'Link Media Sosial', aliases: ['Link Media Sosial', 'Media Sosial', 'Social Media Link', 'Link Medsos'] },
      { name: 'Link Media Online', aliases: ['Link Media Online', 'Media Online', 'Online Media Link'] },
      { name: 'Monitoring Radio', aliases: ['Monitoring Radio', 'Radio', 'Radio Monitoring'] },
      { name: 'Monitoring Media cetak', aliases: ['Monitoring Media cetak', 'Media Cetak', 'Print Media', 'Monitoring Media Cetak'] },
      { name: 'Monitoring Running Text', aliases: ['Monitoring Running Text', 'Running Text', 'Text Running'] },
      { name: 'Monitoring Siaran TV', aliases: ['Monitoring Siaran TV', 'Siaran TV', 'TV Broadcasting', 'TV Monitoring'] }
    ],
    // Membuat kolom opsional - setidaknya satu harus ada
    minRequiredColumns: 1
  },
  'skoring-publikasi-media': {
    requiredColumns: [
      { name: 'Link Media Sosial', aliases: ['Link Media Sosial', 'Media Sosial', 'Social Media Link', 'Link Medsos'] },
      { name: 'Link Media Online', aliases: ['Link Media Online', 'Media Online', 'Online Media Link'] },
      { name: 'Monitoring Radio', aliases: ['Monitoring Radio', 'Radio', 'Radio Monitoring'] },
      { name: 'Monitoring Media cetak', aliases: ['Monitoring Media cetak', 'Media Cetak', 'Print Media', 'Monitoring Media Cetak'] },
      { name: 'Monitoring Running Text', aliases: ['Monitoring Running Text', 'Running Text', 'Text Running'] },
      { name: 'Monitoring Siaran TV', aliases: ['Monitoring Siaran TV', 'Siaran TV', 'TV Broadcasting', 'TV Monitoring'] }
    ],
    minRequiredColumns: 1
  },
  'default': {
    requiredColumns: [
      { name: 'Indikator', aliases: ['Indikator', 'Indicator'] },
      { name: 'Target', aliases: ['Target'] },
      { name: 'Realisasi', aliases: ['Realisasi', 'Realization', 'Actual'] },
      { name: 'Link Video', aliases: ['Link Video', 'Video Link', 'Video'] }
    ],
    minRequiredColumns: 4 // Semua kolom wajib untuk default
  },
};

// Helper function untuk mencocokkan header dengan aliases
function findColumnMapping(headers: string[], columnConfig: any) {
  const mapping: { [key: string]: string } = {};
  const normalizedHeaders = headers.map(h => h.trim());
  
  for (const config of columnConfig.requiredColumns) {
    let found = false;
    for (const alias of config.aliases) {
      const foundHeader = normalizedHeaders.find(h => 
        h.toLowerCase() === alias.toLowerCase()
      );
      if (foundHeader) {
        mapping[config.name] = foundHeader;
        found = true;
        break;
      }
    }
    if (!found) {
      // Cari dengan partial match
      for (const alias of config.aliases) {
        const foundHeader = normalizedHeaders.find(h => 
          h.toLowerCase().includes(alias.toLowerCase()) || 
          alias.toLowerCase().includes(h.toLowerCase())
        );
        if (foundHeader) {
          mapping[config.name] = foundHeader;
          found = true;
          break;
        }
      }
    }
  }
  
  return mapping;
}

// ETL Functions
function extractExcelData(rawData: any, indicatorType: string) {
  console.log('Extracting Excel data...');
  
  if (!rawData || !Array.isArray(rawData) || rawData.length < 2) {
    throw new Error('Invalid or empty raw data format. File must contain a header and at least one row of data.');
  }

  const headers = rawData[0];
  if (!Array.isArray(headers) || headers.length === 0) {
    throw new Error('Invalid headers format or empty headers row');
  }
  
  const dataRows = rawData.slice(1);
  
  const config = INDICATOR_CONFIGS[indicatorType] || INDICATOR_CONFIGS.default;
  
  // Cari mapping kolom berdasarkan aliases
  const columnMapping = findColumnMapping(headers, config);
  const foundColumns = Object.keys(columnMapping);
  
  console.log('Column mapping found:', columnMapping);
  console.log('Available headers:', headers.map(h => h.trim()));
  
  // Periksa apakah memenuhi minimum required columns
  if (foundColumns.length < config.minRequiredColumns) {
    const expectedColumns = config.requiredColumns.map(col => col.name).join(', ');
    const availableHeaders = headers.map(h => h.trim()).join(', ');
    throw new Error(`Insufficient columns for indicator type "${indicatorType}". Expected at least ${config.minRequiredColumns} from: ${expectedColumns}. Available headers: ${availableHeaders}`);
  }
  
  return dataRows.map((row: any[], index: number) => {
    const rowData: any = {};
    
    // Gunakan mapping untuk mengisi data
    Object.entries(columnMapping).forEach(([standardName, actualHeader]) => {
      const colIndex = headers.findIndex((h: string) => h.trim() === actualHeader);
      if (colIndex !== -1) {
        rowData[standardName] = row[colIndex];
      }
    });
    
    // Tambahkan semua kolom lain yang tidak ter-mapping
    headers.forEach((header: string, colIndex: number) => {
      const trimmedHeader = header.trim();
      if (!Object.values(columnMapping).includes(trimmedHeader)) {
        rowData[trimmedHeader] = row[colIndex];
      }
    });
    
    rowData._rowIndex = index + 2;
    return rowData;
  });
}

function transformData(extractedData: any[], indicatorType: string) {
  console.log('Transforming data...');
  
  if (indicatorType === 'skoring-publikasi-media' || indicatorType === 'publikasi-media') {
    return extractedData.map((row: any) => {
      // Ambil semua link dari kolom yang relevan
      const videoLinks = [
        row['Link Media Sosial'],
        row['Link Media Online'],
        row['Monitoring Radio'],
        row['Monitoring Media cetak'],
        row['Monitoring Running Text'],
        row['Monitoring Siaran TV'],
      ].filter(link => link && link.toString().trim() !== ''); // Hapus link yang kosong
      
      const combinedLinks = videoLinks.join(',');

      // Lakukan validasi format video link yang lebih fleksibel
      if (combinedLinks && videoLinks.length > 0) {
        const hasValidLink = videoLinks.some(link => {
          const linkStr = link.toString().toLowerCase();
          return linkStr.includes('sharepoint.com') || 
                 linkStr.includes('drive.google.com') ||
                 linkStr.includes('dropbox.com') ||
                 linkStr.includes('onedrive.live.com') ||
                 linkStr.startsWith('http') ||
                 linkStr.startsWith('https');
        });
        
        if (!hasValidLink) {
          console.warn(`Possibly invalid video link format at row ${row._rowIndex}: ${combinedLinks}`);
        }
      }
      
      return {
        linkMediaSosial: row['Link Media Sosial'] || '',
        linkMediaOnline: row['Link Media Online'] || '',
        monitoringRadio: row['Monitoring Radio'] || '',
        monitoringMediaCetak: row['Monitoring Media cetak'] || '',
        monitoringRunningText: row['Monitoring Running Text'] || '',
        monitoringSiaranTV: row['Monitoring Siaran TV'] || '',
        videoLinks: videoLinks,
        rowIndex: row._rowIndex,
        // Tambahkan kolom tambahan yang mungkin ada
        additionalData: Object.keys(row)
          .filter(key => !['Link Media Sosial', 'Link Media Online', 'Monitoring Radio', 'Monitoring Media cetak', 'Monitoring Running Text', 'Monitoring Siaran TV', '_rowIndex'].includes(key))
          .reduce((acc, key) => {
            acc[key] = row[key];
            return acc;
          }, {} as any)
      };
    });
  }
  
  // Default logic for other indicators
  return extractedData.map((row: any) => {
    const target = parseFloat(row['Target']) || 0;
    const realisasi = parseFloat(row['Realisasi']) || 0;
    const videoLink = row['Link Video'];
    
    if (videoLink && typeof videoLink === 'string' && videoLink.trim() !== '') {
      const linkStr = videoLink.toLowerCase();
      const hasValidFormat = linkStr.includes('sharepoint.com') || 
                           linkStr.includes('drive.google.com') ||
                           linkStr.includes('dropbox.com') ||
                           linkStr.includes('onedrive.live.com') ||
                           linkStr.startsWith('http');
      
      if (!hasValidFormat) {
        console.warn(`Possibly invalid video link format at row ${row._rowIndex}: ${videoLink}`);
      }
    }
    
    return {
      indicator: row['Indikator'],
      target,
      realisasi,
      videoLink: videoLink || '',
      rowIndex: row._rowIndex,
      percentage: target > 0 ? (realisasi / target) * 100 : 0,
      // Tambahkan kolom tambahan yang mungkin ada
      additionalData: Object.keys(row)
        .filter(key => !['Indikator', 'Target', 'Realisasi', 'Link Video', '_rowIndex'].includes(key))
        .reduce((acc, key) => {
          acc[key] = row[key];
          return acc;
        }, {} as any)
    };
  });
}

async function generateVideoHashes(transformedData: any[]) {
  console.log('Generating video hashes...');
  
  // TODO: Implement Microsoft Graph API integration for real video hash generation
  return transformedData.map((item: any) => {
    const videoLinks = item.videoLinks || (item.videoLink ? [item.videoLink] : []);
    
    if (videoLinks.length > 0) {
      // Generate hash untuk setiap link
      const hashes = videoLinks
        .filter((link: any) => link && link.toString().trim() !== '')
        .map((link: any) => {
          const linkStr = link.toString();
          // Simple hash generation (dalam produksi, gunakan hash yang lebih robust)
          const mockHash = `hash_${btoa(linkStr).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}_${Date.now()}`;
          return mockHash;
        });
      
      return {
        ...item,
        videoHash: hashes.length > 0 ? hashes[0] : null, // Untuk kompatibilitas mundur
        videoHashes: hashes // Array semua hash
      };
    }
    return item;
  });
}

async function checkDuplicates(processedData: any[], currentReportId: string) {
  console.log('Checking for duplicates...');
  
  // Kumpulkan semua hash dari data yang diproses
  const allHashes: string[] = [];
  processedData.forEach(item => {
    if (item.videoHashes && Array.isArray(item.videoHashes)) {
      allHashes.push(...item.videoHashes);
    } else if (item.videoHash) {
      allHashes.push(item.videoHash);
    }
  });
  
  if (allHashes.length === 0) {
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
    const commonHashes = allHashes.filter(hash => 
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
  
  // Hitung skor berdasarkan jumlah link yang valid
  let totalLinks = 0;
  let validLinks = 0;
  
  processedData.forEach(item => {
    const videoLinks = item.videoLinks || (item.videoLink ? [item.videoLink] : []);
    totalLinks += videoLinks.length;
    
    validLinks += videoLinks.filter((link: any) => {
      if (!link || link.toString().trim() === '') return false;
      const linkStr = link.toString().toLowerCase();
      return linkStr.includes('sharepoint.com') || 
             linkStr.includes('drive.google.com') ||
             linkStr.includes('dropbox.com') ||
             linkStr.includes('onedrive.live.com') ||
             linkStr.startsWith('http');
    }).length;
  });
  
  if (totalLinks === 0) {
    return Math.floor(Math.random() * 20 + 60); // Score rendah jika tidak ada link
  }
  
  const validityRatio = validLinks / totalLinks;
  const baseScore = Math.floor(validityRatio * 40 + 60); // 60-100 range
  
  return Math.min(100, Math.max(0, baseScore));
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
    const { error: updateError } = await supabase
      .from('reports')
      .update({ status: 'processing' })
      .eq('id', reportId);
    
    if (updateError) {
      console.error('Error updating report status:', updateError);
      return;
    }
    
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (fetchError || !report) {
      console.error('Error fetching report:', fetchError);
      return;
    }
    
    await createNotification(
      report.user_id,
      'report_processing',
      'Laporan Sedang Diproses',
      `Laporan "${report.file_name}" sedang diproses oleh sistem.`,
      reportId
    );
    
    const extractedData = extractExcelData(report.raw_data, report.indicator_type);
    const transformedData = transformData(extractedData, report.indicator_type);
    const processedDataWithHashes = await generateVideoHashes(transformedData);
    
    const duplicateCheck = await checkDuplicates(processedDataWithHashes, reportId);
    
    if (duplicateCheck.hasDuplicates) {
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
    
    const calculatedScore = calculateScore(processedDataWithHashes);
    
    // Kumpulkan semua hash untuk disimpan
    const allVideoHashes: string[] = [];
    processedDataWithHashes.forEach(item => {
      if (item.videoHashes && Array.isArray(item.videoHashes)) {
        allVideoHashes.push(...item.videoHashes);
      } else if (item.videoHash) {
        allVideoHashes.push(item.videoHash);
      }
    });
    
    const { error: finalUpdateError } = await supabase
      .from('reports')
      .update({
        status: 'pending_approval',
        processed_data: processedDataWithHashes,
        calculated_score: calculatedScore,
        video_hashes: allVideoHashes
      })
      .eq('id', reportId);
    
    if (finalUpdateError) {
      throw new Error(`Failed to update report: ${finalUpdateError.message}`);
    }
    
    await createNotification(
      report.user_id,
      'report_completed',
      'Laporan Berhasil Diproses',
      `Laporan "${report.file_name}" telah berhasil diproses dan menunggu persetujuan admin. Skor: ${calculatedScore}`,
      reportId
    );
    
    console.log(`Successfully processed report: ${reportId} with score: ${calculatedScore}`);
    
  } catch (error: any) {
    console.error(`Error processing report ${reportId}:`, error);
    
    await supabase
      .from('reports')
      .update({
        status: 'failed',
        rejection_reason: `Processing error: ${error.message}`
      })
      .eq('id', reportId);
    
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
        `Terjadi kesalahan saat memproses laporan "${report.file_name}": ${error.message}`,
        reportId
      );
    }
  }
}

serve(async (req) => {
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
  } catch (error: any) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});