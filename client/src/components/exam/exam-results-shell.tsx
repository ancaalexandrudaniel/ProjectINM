import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, XCircle } from "lucide-react";

interface ExamResultTab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface ExamResultsShellProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    passed: boolean;
    scoreDisplay: string;
    percentage: number;
    tabs: ExamResultTab[];
    tabListClassName?: string;
    header?: React.ReactNode;
    footer: React.ReactNode;
    children?: React.ReactNode;
}

export function ExamResultsShell({
    open,
    onOpenChange,
    passed,
    scoreDisplay,
    percentage,
    tabs,
    tabListClassName,
    header,
    footer,
    children,
}: ExamResultsShellProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-purple-500/20">
                <DialogHeader className="p-6 border-b bg-muted/20 shrink-0">
                    <DialogTitle className="text-center text-3xl flex items-center justify-center gap-3">
                        {passed ? (
                            <div className="flex items-center gap-2 text-green-400">
                                <Trophy className="h-8 w-8 text-yellow-500 animate-bounce" />
                                <span>ADMIS</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-400">
                                <XCircle className="h-8 w-8 animate-pulse" />
                                <span>RESPINS</span>
                            </div>
                        )}
                        <span className="text-muted-foreground font-thin">|</span>
                        <span className="text-2xl font-light">Scor: {scoreDisplay} ({percentage}%)</span>
                    </DialogTitle>
                    {header}
                </DialogHeader>

                {children ? children : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Tabs defaultValue={tabs[0]?.id} className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 pt-4 shrink-0">
                                <TabsList className={tabListClassName || `grid w-full`} style={!tabListClassName ? { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` } : undefined}>
                                    {tabs.map(tab => (
                                        <TabsTrigger key={tab.id} value={tab.id}>
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                                {tabs.map(tab => (
                                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                                        {tab.content}
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="p-4 border-t bg-muted/20 mt-auto">
                    {footer}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
