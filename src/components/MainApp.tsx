import { useState } from "react";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import DashboardStats from "./dashboard/DashboardStats";
import RecentActivity from "./dashboard/RecentActivity";
import UploadInterface from "./upload/UploadInterface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Clock, FileText, Filter } from "lucide-react";

interface MainAppProps {
  userRole: 'admin' | 'sbu';
  userName: string;
}

const MainApp = ({ userRole = 'admin', userName = 'Admin Central' }: MainAppProps) => {
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView userRole={userRole} />;
      case 'upload':
        return <UploadInterface />;
      case 'approval':
        return <ApprovalDesk />;
      case 'reports':
        return <ReportsManagement />;
      case 'analytics':
        return <AnalyticsView />;
      case 'kpi':
        return <KPIManagement />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView userRole={userRole} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole={userRole}
        userName={userName}
        notificationCount={3}
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar 
          userRole={userRole}
          activeRoute={activeRoute}
          onRouteChange={setActiveRoute}
          isCollapsed={sidebarCollapsed}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Dashboard View Component
const DashboardView = ({ userRole }: { userRole: 'admin' | 'sbu' }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        {userRole === 'admin' 
          ? 'Selamat datang di panel admin DESMON+' 
          : 'Selamat datang di portal pelaporan DESMON+'
        }
      </p>
    </div>
    
    <DashboardStats userRole={userRole} />
    
    <div className="grid gap-6 lg:grid-cols-2">
      <RecentActivity />
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Aksi cepat yang sering digunakan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {userRole === 'sbu' ? (
            <>
              <Button variant="hero" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Upload Laporan Baru
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="mr-2 h-4 w-4" />
                Lihat Status Laporan
              </Button>
            </>
          ) : (
            <>
              <Button variant="hero" className="w-full justify-start">
                <Check className="mr-2 h-4 w-4" />
                Review Laporan Pending
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);

// Mock components for other routes
const ApprovalDesk = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Approval Laporan</h1>
        <p className="text-muted-foreground">Tinjau dan setujui laporan yang masuk</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button variant="hero">Bulk Approve</Button>
      </div>
    </div>
    
    <Card>
      <CardHeader>
        <CardTitle>Laporan Menunggu Approval</CardTitle>
        <CardDescription>23 laporan memerlukan persetujuan Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">Laporan Media Sosial Q4</p>
                <p className="text-sm text-muted-foreground">SBU Jawa Barat • 2 jam yang lalu</p>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Clock className="mr-1 h-3 w-3" />
                  Menunggu Approval
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-3 w-3" />
                  Review
                </Button>
                <Button variant="success" size="sm">
                  <Check className="mr-1 h-3 w-3" />
                  Setujui
                </Button>
                <Button variant="destructive" size="sm">
                  <X className="mr-1 h-3 w-3" />
                  Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Placeholder components for other routes
const ReportsManagement = () => (
  <div className="text-center py-20">
    <h2 className="text-2xl font-bold">Manajemen Laporan</h2>
    <p className="text-muted-foreground">Kelola dan ekspor data laporan</p>
  </div>
);

const AnalyticsView = () => (
  <div className="text-center py-20">
    <h2 className="text-2xl font-bold">Analytics</h2>
    <p className="text-muted-foreground">Visualisasi data dan insights</p>
  </div>
);

const KPIManagement = () => (
  <div className="text-center py-20">
    <h2 className="text-2xl font-bold">Manajemen KPI</h2>
    <p className="text-muted-foreground">Atur target, bobot, dan aturan scoring</p>
  </div>
);

const UserManagement = () => (
  <div className="text-center py-20">
    <h2 className="text-2xl font-bold">Manajemen User</h2>
    <p className="text-muted-foreground">Kelola akun pengguna dan akses</p>
  </div>
);

const SettingsView = () => (
  <div className="text-center py-20">
    <h2 className="text-2xl font-bold">Pengaturan</h2>
    <p className="text-muted-foreground">Konfigurasi sistem dan preferensi</p>
  </div>
);

export default MainApp;