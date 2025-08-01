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

const UploadInterface = () => {
  const [selectedIndicator, setSelectedIndicator] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState<string>("");
  const { toast } = useToast();

  const indicators = [
    {
      id: 'siaran-pers',
      name: 'Produksi Siaran Pers',
      description: 'Laporan kegiatan produksi siaran pers dan komunikasi eksternal'
    },
    {
      id: 'media-sosial',
      name: 'Produksi Konten Media Sosial',
      description: 'Laporan konten media sosial dan engagement'
    },
    {
      id: 'publikasi-media',
      name: 'Skoring Publikasi Media Massa',
      description: 'Laporan dan skor publikasi di media massa'
    },
    {
      id: 'publikasi-sosial',
      name: 'Skoring Publikasi Media Sosial',
      description: 'Laporan skor publikasi di platform media sosial'
    },
    {
      id: 'kampanye-komunikasi',
      name: 'Pengelolaan Kampanye Komunikasi',
      description: 'Laporan kampanye komunikasi dan outreach'
    },
    {
      id: 'ofi-afi',
      name: 'Tindaklanjut OFI to AFI',
      description: 'Laporan tindak lanjut Opportunity for Improvement'
    }
  ];

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

  const handleDownloadTemplate = (indicatorId: string) => {
    // In real app, this would download the actual template
    toast({
      title: "Template Diunduh",
      description: `Template untuk ${indicators.find(i => i.id === indicatorId)?.name} berhasil diunduh`,
    });
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User tidak terautentikasi");
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('indicator_type', selectedIndicator);
      formData.append('user_id', user.id);

      setProcessStatus("Mengunggah file...");
      setUploadProgress(25);

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call edge function
      console.log('Calling edge function with user:', user.id);
      console.log('Session token exists:', !!session?.access_token);
      
      const { data, error } = await supabase.functions.invoke('process-report-upload', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });
      
      console.log('Edge function response:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      setProcessStatus("Memproses data...");
      setUploadProgress(50);

      // Simulate processing steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessStatus("Validasi dan kalkulasi skor...");
      setUploadProgress(75);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessStatus("Menyimpan ke database...");
      setUploadProgress(100);

      if (data.success) {
        toast({
          title: "Upload Berhasil",
          description: `File berhasil diproses. Skor: ${data.score}. Laporan ID: ${data.report_id}`,
        });

        // Reset form
        setSelectedFile(null);
        setSelectedIndicator("");
        setUploadProgress(0);
        setProcessStatus("");
      } else {
        throw new Error(data.error || 'Upload gagal');
      }
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Gagal",
        description: error.message || "Terjadi kesalahan saat mengunggah file. Silakan coba lagi.",
        variant: "destructive"
      });
      setUploadProgress(0);
      setProcessStatus("");
    } finally {
      setIsUploading(false);
    }
  };

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
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis indikator..." />
              </SelectTrigger>
              <SelectContent>
                {indicators.map((indicator) => (
                  <SelectItem key={indicator.id} value={indicator.id}>
                    <div>
                      <div className="font-medium">{indicator.name}</div>
                      <div className="text-sm text-muted-foreground">{indicator.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Download */}
          {selectedIndicator && (
            <div className="p-4 bg-desmon-background/30 rounded-lg border border-desmon-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Template Excel Tersedia</p>
                  <p className="text-sm text-muted-foreground">
                    Unduh template untuk {indicators.find(i => i.id === selectedIndicator)?.name}
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
              disabled={!selectedIndicator || !selectedFile || isUploading}
              className="min-w-32"
              variant="hero"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
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