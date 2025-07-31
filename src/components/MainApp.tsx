import { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current route from URL path
  const getCurrentRoute = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/approval')) return 'approval';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/kpi')) return 'kpi';
    if (path.includes('/users')) return 'users';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/notifications')) return 'notifications';
    return 'dashboard';
  };

  const handleRouteChange = (route: string) => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    navigate(`${basePath}/${route}`);
  };

  const handleNotificationClick = () => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    navigate(`${basePath}/notifications`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole={userRole}
        userName={userName}
        notificationCount={3}
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSignOut={onSignOut}
        onNotificationClick={handleNotificationClick}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar 
          userRole={userRole}
          activeRoute={getCurrentRoute()}
          onRouteChange={handleRouteChange}
          isCollapsed={sidebarCollapsed}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardView userRole={userRole} />} />
              <Route path="/upload" element={<UploadInterface />} />
              <Route path="/reports" element={<ReportsManagement userRole={userRole} currentSBU={currentSBU} />} />
              <Route path="/analytics" element={<AnalyticsView userRole={userRole} currentSBU={currentSBU} />} />
              <Route path="/notifications" element={<NotificationCenter userRole={userRole} />} />
              
              {/* SBU specific routes */}
              {userRole === 'sbu' && (
                <>
                  {/* SBU can access settings too */}
                  <Route path="/settings" element={<SettingsView />} />
                </>
              )}
              
              {/* Admin only routes */}
              {userRole === 'admin' && (
                <>
                  <Route path="/approval" element={<ApprovalDesk />} />
                  <Route path="/kpi" element={<KPIManagement />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/settings" element={<SettingsView />} />
                </>
              )}
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
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