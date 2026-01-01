import { Bell, School } from "lucide-react";

export default function Header() {
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
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Judecator Alex Anca</p>
                <p className="text-xs text-muted-foreground">Candidat INM 2025</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                AA
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
