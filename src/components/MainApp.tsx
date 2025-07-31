import { useState } from "react";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import DashboardStats from "./dashboard/DashboardStats";
import RecentActivity from "./dashboard/RecentActivity";
import UploadInterface from "./upload/UploadInterface";
import AnalyticsView from "./analytics/AnalyticsView";
import KPIManagement from "./kpi/KPIManagement";
import UserManagement from "./user/UserManagement";
import SettingsView from "./settings/SettingsView";
import ReportsManagement from "./reports/ReportsManagement";
import ApprovalDesk from "./approval/ApprovalDesk";
import NotificationCenter from "./notifications/NotificationCenter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Clock, FileText, Filter } from "lucide-react";

interface MainAppProps {
  userRole: 'admin' | 'sbu';
  userName: string;
  currentSBU?: string;
  onSignOut?: () => void;
}

const MainApp = ({ userRole = 'admin', userName = 'Admin Central', currentSBU, onSignOut }: MainAppProps) => {
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
        return <ReportsManagement userRole={userRole} currentSBU={currentSBU} />;
      case 'analytics':
        return <AnalyticsView userRole={userRole} currentSBU="SBU Jawa Barat" />;
      case 'kpi':
        return <KPIManagement />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SettingsView />;
      case 'notifications':
        return <NotificationCenter userRole={userRole} />;
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
        onSignOut={onSignOut}
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

// Removed mock components as they're now in separate files




export default MainApp;