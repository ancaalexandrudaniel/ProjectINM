import { Bell, School, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  subscriptionTier: string;
}

export default function Header() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user");
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("session_token");
      if (token) {
        await fetch("/api/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.error("Logout API error:", e);
    }

    // Clear local storage
    localStorage.removeItem("session_token");
    localStorage.removeItem("user");
    setUser(null);

    // Redirect to login
    setLocation("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "pro":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <School className="text-primary text-4xl h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-primary">INM Prep</h1>
                <p className="text-xs text-muted-foreground">Platformă Pregătire Admitere INM</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-2 rounded-lg">
              <div className="text-sm">
                <p className="font-medium text-primary">28 Septembrie 2025</p>
                <p className="text-xs text-muted-foreground">Test Grilă</p>
              </div>
            </div>

            <button className="relative flex items-center gap-2 hover:bg-secondary px-3 py-2 rounded-lg transition-colors" data-testid="notifications-button">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full"></span>
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 hover:bg-secondary px-3 py-2 rounded-lg transition-colors">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getTierBadge(user.subscriptionTier)}`}>
                        {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {getInitials(user.fullName)}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-500 focus:text-red-500"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Deconectare</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setLocation("/login")}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Autentificare</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
