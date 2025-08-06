import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Download, Eye, Clock, User, Calendar, FileText, Video, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Report } from "@/hooks/useReports";
import { supabase } from "@/integrations/supabase/client";

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  userRole: 'admin' | 'sbu';
  onApprove?: (reportId: string, notes?: string) => void;
  onReject?: (reportId: string, reason: string) => void;
}

const ReportDetailModal = ({ 
  isOpen, 
  onClose, 
  report, 
  userRole, 
  onApprove, 
  onReject 
}: ReportDetailModalProps) => {
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Disetujui Admin</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />Selesai</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ditolak Admin</Badge>;
      case 'system_rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ditolak Sistem</Badge>;
      case 'pending':
      case 'pending_approval':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Menunggu Review</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><BarChart3 className="mr-1 h-3 w-3" />Sedang Diproses</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Gagal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove(report.id, approvalNotes);
      toast({
        title: "Laporan Disetujui",
        description: `Laporan ${report.fileName} telah disetujui dan akan dilanjutkan ke proses kalkulasi skor.`,
      });
      onClose();
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Alasan Diperlukan",
        description: "Silakan berikan alasan penolakan laporan.",
        variant: "destructive"
      });
      return;
    }
    
    if (onReject) {
      onReject(report.id, rejectionReason);
      toast({
        title: "Laporan Ditolak",
        description: `Laporan ${report.fileName} telah ditolak.`,
      });
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!report.filePath) {
      toast({
        title: "Error",
        description: "File tidak tersedia untuk diunduh.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(report.filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Berhasil",
        description: `File ${report.fileName} berhasil diunduh.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Gagal mengunduh file.",
        variant: "destructive"
      });
    }
  };

  const handleOpenVideo = (videoLink: string) => {
    if (videoLink) {
      window.open(videoLink, '_blank');
    } else {
      toast({
        title: "Video Tidak Tersedia",
        description: "Link video tidak ditemukan untuk laporan ini.",
        variant: "destructive"
      });
    }
  };

  // Process actual data from report
  const processedData = report.processedData || {};
  const videoLinks = report.videoLinks || [];
  
  // Calculate stats from processed data
  const getDataStats = () => {
    if (!processedData || typeof processedData !== 'object') {
      return {
        totalEntries: 0,
        validEntries: 0,
        errorEntries: 0,
        score: report.calculatedScore || 0
      };
    }

    // Try to extract stats from processed data structure
    const totalEntries = processedData.totalEntries || processedData.total_rows || 0;
    const validEntries = processedData.validEntries || processedData.valid_rows || totalEntries;
    const errorEntries = processedData.errorEntries || processedData.error_rows || (totalEntries - validEntries);

    return {
      totalEntries,
      validEntries,
      errorEntries,
      score: report.calculatedScore || processedData.score || 0
    };
  };

  const dataStats = getDataStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{report.fileName}</DialogTitle>
              <DialogDescription className="mt-2">
                Detail lengkap laporan dan hasil analisis
              </DialogDescription>
            </div>
            {getStatusBadge(report.status)}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="analysis">Analisis</TabsTrigger>
            <TabsTrigger value="actions">Aksi</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informasi Pelapor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama Pelapor</p>
                    <p className="font-medium">{report.submittedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SBU</p>
                    <p className="font-medium">{report.sbu}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis Indikator</p>
                    <p className="font-medium">{report.indicatorType}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informasi Waktu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Submit</p>
                    <p className="font-medium">{report.submittedAt}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{report.status}</p>
                  </div>
                  {report.calculatedScore && (
                    <div>
                      <p className="text-sm text-muted-foreground">Skor</p>
                      <p className="font-medium text-lg text-desmon-primary">{report.calculatedScore}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(report.rejectionReason || report.approvedBy) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Catatan Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-800">Alasan Penolakan:</p>
                      <p className="text-red-700 mt-1">{report.rejectionReason}</p>
                    </div>
                  )}
                  {report.approvedBy && report.approvedAt && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-800">Disetujui oleh:</p>
                      <p className="text-green-700 mt-1">{report.approvedBy} pada {report.approvedAt}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Data
                </CardTitle>
                <CardDescription>Informasi file yang diunggah</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{report.fileName}</p>
                    <p className="text-sm text-muted-foreground">Excel Spreadsheet • {report.submittedAt}</p>
                  </div>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Unduh
                  </Button>
                </div>

                {Array.isArray(videoLinks) && videoLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium">Video Pendukung</p>
                    {videoLinks.map((link: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Video {index + 1}</p>
                          <p className="text-sm text-muted-foreground">{typeof link === 'string' ? link : link.url || 'Link video'}</p>
                        </div>
                        <Button variant="outline" onClick={() => handleOpenVideo(typeof link === 'string' ? link : link.url)}>
                          <Video className="mr-2 h-4 w-4" />
                          Buka Video
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Hasil Analisis ETL
                </CardTitle>
                <CardDescription>Hasil pemrosesan dan validasi data</CardDescription>
              </CardHeader>
              <CardContent>
                {dataStats.totalEntries > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Entri</p>
                      <p className="text-2xl font-bold">{dataStats.totalEntries}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Entri Valid</p>
                      <p className="text-2xl font-bold text-green-600">{dataStats.validEntries}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Entri Error</p>
                      <p className="text-2xl font-bold text-red-600">{dataStats.errorEntries}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Skor Akhir</p>
                      <p className="text-2xl font-bold text-desmon-primary">{dataStats.score}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Data analisis belum tersedia</p>
                    <p className="text-sm">Laporan belum diproses atau sedang dalam antrian</p>
                  </div>
                )}

                {/* Show raw processed data if available for debugging */}
                {processedData && Object.keys(processedData).length > 0 && (
                  <div className="mt-6 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Data Terproses (Debug):</p>
                    <pre className="text-xs overflow-auto max-h-32">
                      {JSON.stringify(processedData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {userRole === 'admin' && (report.status === 'pending' || report.status === 'pending_approval') && (
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Setujui Laporan</CardTitle>
                    <CardDescription>Berikan persetujuan dengan catatan opsional</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="approval-notes">Catatan Persetujuan (Opsional)</Label>
                      <Textarea
                        id="approval-notes"
                        placeholder="Tambahkan catatan untuk laporan yang disetujui..."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Setujui Laporan
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Tolak Laporan</CardTitle>
                    <CardDescription>Berikan alasan penolakan yang jelas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="rejection-reason">Alasan Penolakan *</Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Jelaskan alasan penolakan laporan..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                      />
                    </div>
                    <Button onClick={handleReject} variant="destructive" className="w-full">
                      <XCircle className="mr-2 h-4 w-4" />
                      Tolak Laporan
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {userRole === 'sbu' && (
              <Card>
                <CardHeader>
                  <CardTitle>Aksi Laporan</CardTitle>
                  <CardDescription>Aksi yang tersedia untuk laporan Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" onClick={handleDownload} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Unduh File Laporan
                  </Button>
                  {Array.isArray(videoLinks) && videoLinks.length > 0 && (
                    <Button variant="outline" onClick={() => handleOpenVideo(videoLinks[0])} className="w-full">
                      <Video className="mr-2 h-4 w-4" />
                      Lihat Video Pendukung
                    </Button>
                  )}
                  {report.status === 'rejected' && (
                    <Button variant="default" className="w-full bg-desmon-primary hover:bg-desmon-primary/90">
                      <FileText className="mr-2 h-4 w-4" />
                      Upload Ulang Perbaikan
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {(userRole === 'admin' && report.status !== 'pending' && report.status !== 'pending_approval') && (
              <Card>
                <CardHeader>
                  <CardTitle>Aksi Admin</CardTitle>
                  <CardDescription>Aksi administratif untuk laporan ini</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" onClick={handleDownload} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Unduh File Laporan
                  </Button>
                  {Array.isArray(videoLinks) && videoLinks.length > 0 && (
                    <Button variant="outline" onClick={() => handleOpenVideo(videoLinks[0])} className="w-full">
                      <Video className="mr-2 h-4 w-4" />
                      Lihat Video Pendukung
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDetailModal;