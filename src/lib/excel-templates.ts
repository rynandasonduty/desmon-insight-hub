/**
 * Excel Template Management for DASHMON
 * 
 * TEMPLATE EXCEL FILES LOCATION:
 * Place your Excel template files in: /public/templates/excel/
 * 
 * File naming convention:
 * - PUBLIKASI_SIARAN_PERS.xlsx
 * - PRODUKSI_KONTEN_MEDSOS.xlsx
 * - SKORING_PUBLIKASI_MEDIA.xlsx
 * - KAMPANYE_KOMUNIKASI.xlsx
 * - OFI_TO_AFI.xlsx
 * 
 * Template structure should match the expected format for each indicator.
 */

import * as XLSX from 'xlsx';

export interface ExcelTemplate {
  code: string;
  name: string;
  description: string;
  fileName: string;
  columns: string[];
  requiredColumns: string[];
  optionalColumns?: string[];
  sampleData?: any[];
}

export const EXCEL_TEMPLATES: ExcelTemplate[] = [
  {
    code: 'PUBLIKASI_SIARAN_PERS',
    name: 'Publikasi Siaran Pers Sub Holding',
    description: 'Template untuk laporan publikasi siaran pers dengan target 10 per bulan atau 60 per semester',
    fileName: 'PUBLIKASI_SIARAN_PERS.xlsx',
    columns: ['Judul Siaran Pers', 'Link Publikasi', 'Media', 'Kategori', 'Catatan'],
    requiredColumns: ['Judul Siaran Pers', 'Link Publikasi'],
    optionalColumns: ['Media', 'Kategori', 'Catatan'],
    sampleData: [
      {
        'Judul Siaran Pers': 'Pertamina Luncurkan Program Energi Terbarukan',
        'Link Publikasi': 'https://example.com/news/pertamina-energi-terbarukan',
        'Media': 'Kompas.com',
        'Kategori': 'Energi',
        'Catatan': 'Berita positif'
      }
    ]
  },
  {
    code: 'PRODUKSI_KONTEN_MEDSOS',
    name: 'Produksi Konten Media Sosial',
    description: 'Template untuk laporan produksi konten media sosial dengan target 10 per bulan atau 60 per semester',
    fileName: 'PRODUKSI_KONTEN_MEDSOS.xlsx',
    columns: ['Platform', 'Jenis Konten', 'Link Konten', 'Engagement', 'Reach', 'Catatan'],
    requiredColumns: ['Platform', 'Jenis Konten', 'Link Konten'],
    optionalColumns: ['Engagement', 'Reach', 'Catatan'],
    sampleData: [
      {
        'Platform': 'Instagram',
        'Jenis Konten': 'Post',
        'Link Konten': 'https://instagram.com/p/example',
        'Engagement': '1500',
        'Reach': '5000',
        'Catatan': 'Konten viral'
      }
    ]
  },
  {
    code: 'SKORING_PUBLIKASI_MEDIA',
    name: 'Skoring Hasil Publikasi Media Massa',
    description: 'Template untuk laporan skoring publikasi media massa dengan berbagai jenis media',
    fileName: 'SKORING_PUBLIKASI_MEDIA.xlsx',
    columns: [
      'Link Berita Media Online', 'Link Media Sosial', 'Monitoring Radio', 
      'Monitoring Media cetak', 'Monitoring Running Text', 'Monitoring Siaran TV'
    ],
    requiredColumns: ['Link Berita Media Online'],
    optionalColumns: ['Link Media Sosial', 'Monitoring Radio', 'Monitoring Media cetak', 'Monitoring Running Text', 'Monitoring Siaran TV'],
    sampleData: [
      {
        'Link Berita Media Online': 'https://pelayananpublik.id/2025/05/23/tingkatkan-layanan-internet-pln-icon-plus-sumbagut-komitmen-lakukan-perbaikan-dan-peningkatan-jaringan-fiber-optic/',
        'Link Media Sosial': 'https://www.instagram.com/p/DKSAWthwXZ/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
        'Monitoring Radio': 'https://drive.google.com/file/d/1PzHzxRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link',
        'Monitoring Media cetak': 'https://drive.google.com/file/d/1Qz4F5xRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link',
        'Monitoring Running Text': 'https://drive.google.com/file/d/1Rz6G7xRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link',
        'Monitoring Siaran TV': 'https://drive.google.com/file/d/1Sz8H9xRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link'
      }
    ]
  },
  {
    code: 'KAMPANYE_KOMUNIKASI',
    name: 'Pengelolaan Kampanye Komunikasi',
    description: 'Template untuk laporan kampanye komunikasi dengan target 1 per semester',
    fileName: 'KAMPANYE_KOMUNIKASI.xlsx',
    columns: ['Nama Kampanye', 'Target Audience', 'Media', 'Budget', 'Hasil', 'Catatan'],
    requiredColumns: ['Nama Kampanye'],
    optionalColumns: ['Target Audience', 'Media', 'Budget', 'Hasil', 'Catatan'],
    sampleData: [
      {
        'Nama Kampanye': 'Kampanye Keselamatan Berkendara',
        'Target Audience': 'Masyarakat umum',
        'Media': 'TV, Radio, Digital',
        'Budget': '50000000',
        'Hasil': 'Meningkat 25%',
        'Catatan': 'Kampanye berhasil'
      }
    ]
  },
  {
    code: 'OFI_TO_AFI',
    name: 'OFI to AFI',
    description: 'Template untuk laporan program OFI to AFI dengan target 1 per semester',
    fileName: 'OFI_TO_AFI.xlsx',
    columns: ['Nama Program', 'Lokasi', 'Peserta', 'Materi', 'Durasi', 'Hasil', 'Catatan'],
    requiredColumns: ['Nama Program'],
    optionalColumns: ['Lokasi', 'Peserta', 'Materi', 'Durasi', 'Hasil', 'Catatan'],
    sampleData: [
      {
        'Nama Program': 'Pelatihan Kepemimpinan',
        'Lokasi': 'Jakarta',
        'Peserta': '50 orang',
        'Materi': 'Leadership Skills',
        'Durasi': '3 hari',
        'Hasil': '100% lulus',
        'Catatan': 'Program sukses'
      }
    ]
  }
];

export const getTemplateByCode = (code: string): ExcelTemplate | undefined => {
  return EXCEL_TEMPLATES.find(template => template.code === code);
};

export const getTemplateFileName = (code: string): string => {
  const template = getTemplateByCode(code);
  return template?.fileName || `${code}.xlsx`;
};

export const getTemplatePath = (code: string): string => {
  return `/templates/excel/${getTemplateFileName(code)}`;
};

/**
 * VALIDATION FUNCTIONS
 */
export const validateExcelData = (data: any[], template: ExcelTemplate): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('File Excel tidak boleh kosong');
    return { isValid: false, errors };
  }

  // Get actual columns from the data
  const firstRow = data[0];
  const actualColumns = Object.keys(firstRow);
  
  // Basic validation - just check that we have some data
  if (actualColumns.length === 0) {
    errors.push('File Excel tidak memiliki kolom data');
    return { isValid: false, errors };
  }

  // Check that rows have some content (at least one non-empty cell per row)
  data.forEach((row, index) => {
    const hasContent = Object.values(row).some(value => 
      value !== null && value !== undefined && value.toString().trim() !== ''
    );
    
    if (!hasContent) {
      errors.push(`Baris ${index + 1}: Tidak ada data yang valid`);
    }
  });

  // Limit validation errors to prevent overwhelming output
  if (errors.length > 10) {
    errors.splice(10);
    errors.push('... dan error lainnya. Periksa format file Excel Anda.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * TEMPLATE DOWNLOAD FUNCTIONS
 */
export const downloadTemplate = async (code: string): Promise<void> => {
  try {
    const template = getTemplateByCode(code);
    if (!template) {
      throw new Error(`Template tidak ditemukan untuk kode: ${code}`);
    }

    const response = await fetch(getTemplatePath(code));
    if (!response.ok) {
      throw new Error(`Template file tidak ditemukan: ${template.fileName}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading template:', error);
    throw error;
  }
};

/**
 * TEMPLATE GENERATION (for dynamic templates)
 */
export const generateTemplateFromData = (template: ExcelTemplate): any[] => {
  return template.sampleData || [];
};

/**
 * READ EXCEL FILE FUNCTION
 */
export const readExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            reject(new Error('File Excel tidak memiliki worksheet'));
            return;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (!jsonData || jsonData.length === 0) {
            reject(new Error('File Excel kosong atau tidak memiliki data'));
            return;
          }
          
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Gagal membaca file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Gagal membaca file'));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(new Error(`Error saat memproses file: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};