import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (loginData.email === "admin@desmon.com") {
        navigate("/admin/dashboard");
        toast({ title: "Login Berhasil", description: "Selamat datang, Admin!" });
      } else {
        navigate("/sbu/dashboard");
        toast({ title: "Login Berhasil", description: "Selamat datang di DESMON+!" });
      }
    } catch (error) {
      toast({ title: "Login Gagal", description: "Email atau password salah.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-desmon-primary/5 via-background to-desmon-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-r from-desmon-primary to-desmon-secondary rounded-2xl mx-auto flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-desmon-primary to-desmon-secondary bg-clip-text text-transparent">DESMON+</h1>
          <p className="text-muted-foreground">Digital Excellence Score Monitoring</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demo Credentials</CardTitle>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Badge variant="outline">Admin</Badge>
                <span className="text-sm">admin@desmon.com / admin123</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant="outline">SBU User</Badge>
                <span className="text-sm">sbu@desmon.com / sbu123</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                {isLoading ? "Loading..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;