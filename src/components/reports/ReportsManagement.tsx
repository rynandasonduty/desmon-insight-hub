import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  Trash2,
  Calendar,
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  RefreshCw
} from "lucide-react";
import ReportDetailModal from "./ReportDetailModal";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useReports, useReportActions, Report } from "@/hooks/useReports";
import { supabase } from "@/integrations/supabase/client";

interface ReportsManagementProps {
  userRole: 'admin' | 'sbu';
  currentSBU?: string;
  userId?: string;
}

const ReportsManagement = ({ userRole, currentSBU, userId: propUserId }: ReportsManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [indicatorFilter, setIndicatorFilter] = useState("all");
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [indicatorTypes, setIndicatorTypes] = useState<string[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use propUserId if provided, otherwise get from auth
  const userId = propUserId || null;

  // Fetch data using hooks
  const { reports, loading, error, refetch } = useReports(userRole, userId || undefined, currentSBU);
  const { approveReport, rejectReport, loading: actionLoading } = useReportActions();

  // Get unique indicator types from reports
  useEffect(() => {
    const types = Array.from(new Set(reports.map(report => report.indicatorType).filter(Boolean)));
    setIndicatorTypes(types);
  }, [reports]);

  // Filter reports based on search and filters
  const filteredReports = reports.filter(report => {
    // Apply search filter
    if (searchTerm && !report.fileName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !report.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    // Apply status filter
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    
    // Apply indicator type filter
    if (indicatorFilter !== "all" && report.indicatorType !== indicatorFilter) return false;
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />Selesai</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Disetujui Admin</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Ditolak Admin</Badge>;
      case 'system_rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ditolak Sistem</Badge>;
      case 'pending':
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><TrendingUp className="mr-1 h-3 w-3" />Diproses</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(filteredReports.map(report => report.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports([...selectedReports, reportId]);
    } else {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    }
  };

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setDetailModalOpen(true);
  };

  const handleGenerateReport = () => {
    toast({
      title: "Generate Report",
      description: "Laporan sedang dibuat. Anda akan menerima notifikasi setelah selesai.",
    });
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedReport(null);
  };

  const handleApproveReport = async (reportId: string, notes?: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User tidak teridentifikasi. Silakan login ulang.",
        variant: "destructive"
      });
      return;
    }

    const result = await approveReport(reportId, userId, notes);
    
    if (result.success) {
      toast({
        title: "Laporan Disetujui",
        description: `Laporan telah disetujui${notes ? ' dengan catatan' : ''}.`,
      });
      refetch(); // Refresh data
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menyetujui laporan.",
        variant: "destructive"
      });
    }
  };

  const handleRejectReport = async (reportId: string, reason: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User tidak teridentifikasi. Silakan login ulang.",
        variant: "destructive"
      });
      return;
    }

    const result = await rejectReport(reportId, userId, reason);
    
    if (result.success) {
      toast({
        title: "Laporan Ditolak",
        description: "Laporan telah ditolak dengan alasan yang diberikan.",
      });
      refetch(); // Refresh data
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menolak laporan.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadReport = async (report: Report) => {
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

  const handleUploadNew = () => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    navigate(`${basePath}/upload`);
  };

  const handleExportReports = () => {
    toast({
      title: "Export Data",
      description: "Data laporan sedang diekspor ke Excel.",
    });
  };

  const handleRefreshData = () => {
    refetch();
    toast({
      title: "Data Diperbarui",
      description: "Data laporan telah diperbarui dari database.",
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Error Memuat Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {userRole === 'admin' ? 'Manajemen Laporan' : 'Laporan Saya'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' 
              ? 'Kelola dan review semua laporan yang masuk' 
              : `Laporan yang telah disubmit${currentSBU ? ` oleh ${currentSBU}` : ''}`
            }
          </p>
        </div>
        <div className="flex gap-2">
          {userRole === 'sbu' && (
            <Button variant="hero" onClick={handleUploadNew}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Laporan Baru
            </Button>
          )}
          <Button variant="outline" onClick={handleExportReports}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {userRole === 'admin' && selectedReports.length > 0 && (
            <Button variant="hero" disabled={actionLoading}>
              Bulk Action ({selectedReports.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan nama file atau pembuat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="pending_approval">Menunggu Approval</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
                <SelectItem value="system_rejected">Ditolak Sistem</SelectItem>
                <SelectItem value="processing">Diproses</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>

            <Select value={indicatorFilter} onValueChange={setIndicatorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Jenis Indikator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Indikator</SelectItem>
                {indicatorTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              toast({
                title: "Filter Diterapkan",
                description: "Filter laporan berhasil diterapkan.",
              });
            }}>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" onClick={handleGenerateReport}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button onClick={handleExportReports}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Laporan</CardTitle>
              <CardDescription>
                {loading ? 'Memuat data...' : `Menampilkan ${filteredReports.length} laporan`}
              </CardDescription>
            </div>
            {userRole === 'admin' && !loading && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={filteredReports.length > 0 && selectedReports.length === filteredReports.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm">Pilih Semua</label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-64" />
                      <div className="h-3 bg-muted animate-pulse rounded w-48" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Tidak ada laporan yang ditemukan</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-4">
                    {userRole === 'admin' && (
                      <Checkbox
                        checked={selectedReports.includes(report.id)}
                        onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                      />
                    )}
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{report.fileName}</span>
                        {getStatusBadge(report.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {report.submittedBy}
                        </div>
                        {userRole === 'admin' && (
                          <div className="flex items-center gap-1">
                            <span>•</span>
                            <span>{report.sbu}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {report.submittedAt}
                        </div>
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>{report.indicatorType}</span>
                        </div>
                        {report.calculatedScore && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Score: {report.calculatedScore}
                          </div>
                        )}
                      </div>

                      {report.rejectionReason && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          <strong>Alasan Penolakan:</strong> {report.rejectionReason}
                        </div>
                      )}

                      {report.approvedBy && report.approvedAt && (
                        <div className="text-sm text-green-600">
                          Disetujui oleh {report.approvedBy} pada {report.approvedAt}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetail(report)}>
                      <Eye className="mr-1 h-3 w-3" />
                      Detail
                    </Button>
                    {userRole === 'admin' && (report.status === 'pending' || report.status === 'pending_approval') && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleApproveReport(report.id)}
                          disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Setujui
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleRejectReport(report.id, "Ditolak oleh admin")}
                          disabled={actionLoading}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Tolak
                        </Button>
                      </>
                    )}
                    {(userRole === 'sbu' && report.status === 'rejected') && (
                      <Button variant="outline" size="sm" onClick={() => {
                        toast({
                          title: "Redirect ke Upload",
                          description: "Mengarahkan ke halaman upload untuk mengunggah ulang laporan.",
                        });
                        handleUploadNew();
                      }}>
                        <Edit className="mr-1 h-3 w-3" />
                        Upload Ulang
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report)}>
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        userRole={userRole}
        onApprove={async (reportId: string) => {
          await handleApproveReport(reportId);
        }}
        onReject={async (reportId: string, reason: string) => {
          await handleRejectReport(reportId, reason);
        }}
      />
    </div>
  );
};

export default ReportsManagement;