
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { useKPIDefinitions } from "@/hooks/useKPIDefinitions";

const UploadInterface = () => {
  const [selectedIndicator, setSelectedIndicator] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState<string>("");
  const { toast } = useToast();

  // Fetch KPI definitions from Supabase
  const { kpiDefinitions, loading: kpiLoading, error: kpiError } = useKPIDefinitions();

  // Create template data for different indicator types
  const createExcelTemplate = (indicatorType: string, indicatorName: string) => {
    // Basic template structure based on indicator type
    const templates: { [key: string]: any } = {
      'skoring-publikasi-media': [
        ['No', 'Platform', 'Judul Konten', 'Link URL', 'Tanggal Publikasi', 'Jenis Media', 'Reach/Views', 'Engagement', 'Sentiment', 'Kategori'],
        [1, 'Facebook', 'Contoh judul post', 'https://facebook.com/post/123', '2024-01-15', 'Media Sosial', 1500, 50, 'Positif', 'Informasi'],
        [2, 'Instagram', 'Contoh konten Instagram', 'https://instagram.com/p/abc123', '2024-01-16', 'Media Sosial', 2000, 75, 'Positif', 'Promosi'],
        [3, 'Website', 'Artikel berita terbaru', 'https://website.com/artikel', '2024-01-17', 'Online', 5000, 120, 'Netral', 'Berita']
      ],
      'media-sosial': [
        ['No', 'Platform', 'Jenis Konten', 'Caption/Judul', 'Tanggal Post', 'Waktu Post', 'Hashtags', 'Reach', 'Impressions', 'Engagement', 'Comments', 'Shares'],
        [1, 'Facebook', 'Image Post', 'Contoh caption untuk Facebook', '2024-01-15', '10:00', '#contoh #facebook', 1500, 2000, 50, 10, 5],
        [2, 'Instagram', 'Stories', 'Instagram stories content', '2024-01-16', '14:30', '#instagram #stories', 800, 1200, 30, 5, 2],
        [3, 'Twitter', 'Tweet', 'Tweet example content', '2024-01-17', '09:15', '#twitter #content', 500, 800, 25, 8, 3]
      ],
      'siaran-pers': [
        ['No', 'Judul Siaran Pers', 'Tanggal Rilis', 'Media Target', 'Status Publikasi', 'Link Publikasi', 'Reach Estimasi', 'Kategori Berita'],
        [1, 'Contoh Judul Siaran Pers', '2024-01-15', 'Media Nasional', 'Published', 'https://media.com/news/123', 10000, 'Corporate'],
        [2, 'Press Release Example', '2024-01-16', 'Media Regional', 'Sent', '', 5000, 'Product Launch'],
        [3, 'Siaran Pers Kegiatan', '2024-01-17', 'Media Online', 'Published', 'https://online.com/pr/456', 7500, 'Event']
      ],
      'default': [
        ['No', 'Judul/Nama Kegiatan', 'Tanggal', 'Deskripsi', 'Target/KPI', 'Hasil Actual', 'Satuan', 'Keterangan'],
        [1, 'Contoh Kegiatan 1', '2024-01-15', 'Deskripsi kegiatan pertama', 100, 95, 'Unit', 'Berhasil'],
        [2, 'Contoh Kegiatan 2', '2024-01-16', 'Deskripsi kegiatan kedua', 200, 180, 'Unit', 'Dalam Progress'],
        [3, 'Contoh Kegiatan 3', '2024-01-17', 'Deskripsi kegiatan ketiga', 150, 160, 'Unit', 'Melampaui Target']
      ]
    };

    return templates[indicatorType] || templates['default'];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Format File Tidak Valid",
          description: "Silakan pilih file Excel (.xlsx atau .xls)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Terlalu Besar",
          description: "Ukuran file maksimal 10MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = async (indicatorCode: string) => {
    try {
      const selectedKPI = kpiDefinitions.find(kpi => kpi.code === indicatorCode);
      if (!selectedKPI) {
        toast({
          title: "Error",
          description: "Indikator tidak ditemukan",
          variant: "destructive"
        });
        return;
      }

      // Create Excel-like CSV content
      const templateData = createExcelTemplate(indicatorCode, selectedKPI.name);
      
      // Convert to CSV format
      const csvContent = templateData
        .map(row => row.map((cell: any) => `"${cell}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Template_${selectedKPI.name.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      toast({
        title: "Template Berhasil Diunduh",
        description: `Template untuk ${selectedKPI.name} telah diunduh sebagai file CSV. Anda dapat membukanya dengan Excel dan menyimpan sebagai .xlsx`,
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: "Error",
        description: "Gagal mengunduh template. Silakan coba lagi.",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedIndicator || !selectedFile) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Silakan pilih indikator dan file Excel",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessStatus("Menyiapkan upload...");

    try {
      // Get current user
      console.log('🔐 Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User tidak terautentikasi");
      }
      console.log('✅ User authenticated:', user.id);

      // Get session for authorization
      console.log('🔐 Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Session tidak valid");
      }
      console.log('✅ Session obtained');

      // Create FormData
      console.log('📝 Creating form data...');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('indicator_type', selectedIndicator);
      formData.append('user_id', user.id);

      setProcessStatus("Mengunggah file...");
      setUploadProgress(25);

      // Call edge function
      console.log('🚀 Calling edge function...');
      console.log('📋 Upload details:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        indicator: selectedIndicator,
        userId: user.id
      });
      
      const { data, error } = await supabase.functions.invoke('process-report-upload', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });
      
      console.log('📨 Edge function response received:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Terjadi kesalahan saat memproses file');
      }

      setProcessStatus("Memvalidasi file...");
      setUploadProgress(50);

      // Check response
      if (!data) {
        throw new Error('Tidak ada response dari server');
      }

      if (!data.success) {
        console.error('❌ Upload failed:', data.error);
        throw new Error(data.error || 'Upload gagal');
      }

      setProcessStatus("File diterima sistem...");
      setUploadProgress(75);

      // Short delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessStatus("Laporan sedang diproses...");
      setUploadProgress(100);

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🎉 Upload queued successfully!', {
        reportId: data.report_id,
        status: data.status
      });

      toast({
        title: "Laporan Berhasil Diunggah!",
        description: "Laporan Anda telah masuk ke antrian untuk validasi sistem. Setelah validasi, laporan akan menunggu persetujuan admin sebelum dihitung skornya.",
      });

      // Reset form
      setSelectedFile(null);
      setSelectedIndicator("");
      setUploadProgress(0);
      setProcessStatus("");
      
    } catch (error: any) {
      console.error('💥 Upload error:', error);
      
      let errorMessage = "Terjadi kesalahan saat mengunggah file.";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Gagal",
        description: errorMessage,
        variant: "destructive"
      });
      
      setUploadProgress(0);
      setProcessStatus("");
    } finally {
      setIsUploading(false);
    }
  };

  // Show loading or error states
  if (kpiError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive">Error Memuat Data</h3>
            <p className="text-muted-foreground text-center">{kpiError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card className="border-desmon-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-desmon-secondary/10 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-desmon-secondary" />
            </div>
            Panduan Upload Laporan
          </CardTitle>
          <CardDescription>
            Ikuti langkah-langkah berikut untuk mengunggah laporan Excel Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-desmon-primary rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
            <div>
              <p className="font-medium">Pilih Jenis Indikator</p>
              <p className="text-sm text-muted-foreground">Tentukan kategori laporan yang akan Anda unggah</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-desmon-primary rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
            <div>
              <p className="font-medium">Unduh Template Excel</p>
              <p className="text-sm text-muted-foreground">Gunakan template yang sesuai dengan indikator yang dipilih</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-desmon-primary rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
            <div>
              <p className="font-medium">Isi Data & Upload</p>
              <p className="text-sm text-muted-foreground">Lengkapi template dengan data Anda dan unggah ke sistem</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Laporan Excel</CardTitle>
          <CardDescription>
            Unggah file laporan Excel sesuai dengan indikator yang dipilih
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Indicator Selection */}
          <div className="space-y-2">
            <Label htmlFor="indicator">Jenis Indikator Laporan</Label>
            {kpiLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : (
              <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis indikator..." />
                </SelectTrigger>
                <SelectContent>
                  {kpiDefinitions.map((kpi) => (
                    <SelectItem key={kpi.id} value={kpi.code}>
                      <div>
                        <div className="font-medium">{kpi.name}</div>
                        {kpi.description && (
                          <div className="text-sm text-muted-foreground">{kpi.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template Download */}
          {selectedIndicator && !kpiLoading && (
            <div className="p-4 bg-desmon-background/30 rounded-lg border border-desmon-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Template Excel Tersedia</p>
                  <p className="text-sm text-muted-foreground">
                    Unduh template untuk {kpiDefinitions.find(kpi => kpi.code === selectedIndicator)?.name}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadTemplate(selectedIndicator)}
                  className="border-desmon-secondary text-desmon-primary hover:bg-desmon-secondary/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Unduh Template
                </Button>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">File Excel</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Format yang didukung: .xlsx, .xls (Maksimal 10MB)
            </p>
          </div>

          {/* Progress Indicator */}
          {isUploading && (
            <div className="space-y-3 p-4 bg-desmon-background/30 rounded-lg border border-desmon-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress Upload</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              {processStatus && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-desmon-primary" />
                  <span className="text-sm text-muted-foreground">{processStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleUpload}
              disabled={!selectedIndicator || !selectedFile || isUploading || kpiLoading}
              className="min-w-32"
              variant="hero"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim ke Antrian...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Unggah Laporan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadInterface;
