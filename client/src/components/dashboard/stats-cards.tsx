import { Vote, CheckCircle, Clock, TrendingDown } from "lucide-react";

interface StatsCardsProps {
  totalTests: number;
  accuracy: number;
  studyTime: number;
  weakPoints: number;
}

export default function StatsCards({ totalTests, accuracy, studyTime, weakPoints }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Vote className="text-primary h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded">+12%</span>
        </div>
        <p className="text-2xl font-bold" data-testid="total-tests-stat">{totalTests}</p>
        <p className="text-sm text-muted-foreground">Teste Completate</p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="text-success h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded">+8%</span>
        </div>
        <p className="text-2xl font-bold" data-testid="accuracy-stat">{accuracy}%</p>
        <p className="text-sm text-muted-foreground">Acuratețe Medie</p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Clock className="text-accent h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">săptămâna</span>
        </div>
        <p className="text-2xl font-bold" data-testid="study-time-stat">{studyTime}h</p>
        <p className="text-sm text-muted-foreground">Ore de Studiu</p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="text-destructive h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">urgent</span>
        </div>
        <p className="text-2xl font-bold" data-testid="weak-points-stat">{weakPoints}</p>
        <p className="text-sm text-muted-foreground">Puncte Slabe</p>
      </div>
    </div>
  );
}
