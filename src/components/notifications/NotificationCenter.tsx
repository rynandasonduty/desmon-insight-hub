import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  User, 
  Settings,
  AlertTriangle,
  TrendingUp,
  Mail
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'report_approved' | 'report_rejected' | 'report_submitted' | 'kpi_updated' | 'system' | 'user_activity';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedReportId?: string;
  priority: 'low' | 'medium' | 'high';
}

// Mock data for notifications
const mockNotifications: Notification[] = [
  {
    id: "notif-001",
    type: "report_approved",
    title: "Laporan Disetujui",
    message: "Laporan Media Sosial Q4 2024.xlsx telah disetujui dengan score 85.5",
    createdAt: "2024-01-16 09:15",
    isRead: false,
    relatedReportId: "RPT-001",
    priority: "high"
  },
  {
    id: "notif-002",
    type: "report_submitted",
    title: "Laporan Baru Masuk",
    message: "Ahmad Sutanto (SBU Jawa Barat) telah mengsubmit laporan baru untuk review",
    createdAt: "2024-01-15 14:30",
    isRead: false,
    relatedReportId: "RPT-002",
    priority: "medium"
  },
  {
    id: "notif-003",
    type: "report_rejected",
    title: "Laporan Ditolak",
    message: "Website Analytics Dec 2023.xlsx ditolak karena data tidak lengkap",
    createdAt: "2024-01-14 08:30",
    isRead: true,
    relatedReportId: "RPT-003",
    priority: "high"
  },
  {
    id: "notif-004",
    type: "kpi_updated",
    title: "KPI Diperbarui",
    message: "Admin telah memperbarui definisi KPI untuk Media Sosial",
    createdAt: "2024-01-13 16:20",
    isRead: true,
    priority: "low"
  },
  {
    id: "notif-005",
    type: "system",
    title: "Maintenance Terjadwal",
    message: "Sistem akan maintenance pada 20 Januari 2024 pukul 02:00-04:00 WIB",
    createdAt: "2024-01-12 10:00",
    isRead: false,
    priority: "medium"
  },
  {
    id: "notif-006",
    type: "user_activity",
    title: "User Baru Terdaftar",
    message: "Siti Rahayu telah bergabung sebagai user SBU Jawa Tengah",
    createdAt: "2024-01-11 14:45",
    isRead: true,
    priority: "low"
  }
];

interface NotificationCenterProps {
  userRole: 'admin' | 'sbu';
}

const NotificationCenter = ({ userRole }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'report_approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'report_rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'report_submitted':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'kpi_updated':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'system':
        return <Settings className="h-4 w-4 text-orange-600" />;
      case 'user_activity':
        return <User className="h-4 w-4 text-indigo-600" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Tinggi</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Sedang</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Rendah</Badge>;
      default:
        return null;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAsUnread = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: false }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
    
    toast({
      title: "Semua notifikasi ditandai sudah dibaca",
      description: `${unreadCount} notifikasi telah ditandai sebagai sudah dibaca`,
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} hari yang lalu`;
    } else if (diffHours > 0) {
      return `${diffHours} jam yang lalu`;
    } else {
      return "Baru saja";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifikasi
            {unreadCount > 0 && (
              <Badge className="bg-red-600 text-white">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Kelola dan pantau notifikasi sistem
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
          >
            {filter === 'all' ? 'Tampilkan Belum Dibaca' : 'Tampilkan Semua'}
          </Button>
          {unreadCount > 0 && (
            <Button 
              variant="hero" 
              size="sm"
              onClick={markAllAsRead}
            >
              Tandai Semua Sudah Dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              Semua ({notifications.length})
            </Button>
            <Button 
              variant={filter === 'unread' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Belum Dibaca ({unreadCount})
            </Button>
            <Button 
              variant={filter === 'read' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('read')}
            >
              Sudah Dibaca ({notifications.length - unreadCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Notifikasi</CardTitle>
          <CardDescription>
            Menampilkan {filteredNotifications.length} notifikasi
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-1 p-4">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      !notification.isRead 
                        ? 'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h4>
                            {getPriorityBadge(notification.priority)}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(notification.createdAt)}
                            {notification.relatedReportId && (
                              <>
                                <span>•</span>
                                <span>ID: {notification.relatedReportId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        {notification.isRead ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsUnread(notification.id);
                            }}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && <Separator />}
                </div>
              ))}

              {filteredNotifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {filter === 'unread' ? 'Tidak ada notifikasi baru' : 'Tidak ada notifikasi'}
                  </h3>
                  <p className="text-muted-foreground">
                    {filter === 'unread' 
                      ? 'Semua notifikasi telah dibaca'
                      : 'Belum ada notifikasi yang masuk'
                    }
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;