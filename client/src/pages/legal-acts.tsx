import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, FileText, Scale, Shield, Gavel, ExternalLink, ChevronRight, ChevronDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface LegislativeAct {
    id: string;
    actType: string | null;
    actNumber: string | null;
    actTitle: string | null;
    publishedInMO: string | null;
    effectiveDate: string | null;
    sourceUrl: string | null;
    fetchedAt: string | null;
    isCurrentVersion: boolean | null;
    fullText?: string | null;
    htmlText?: string | null;
}

interface ActsResponse {
    success: boolean;
    count: number;
    acts: LegislativeAct[];
}

interface ActDetailResponse {
    success: boolean;
    act: LegislativeAct;
}

interface StatsResponse {
    success: boolean;
    totalActs: number;
    byType: Record<string, number>;
}

// Map act types to icons
const actTypeIcons: Record<string, typeof Scale> = {
    'Cod': BookOpen,
    'Lege': FileText,
    'OG': Gavel,
    'OUG': Gavel,
    'Constituție': Shield,
    'default': Scale
};

// Map act types to colors
const actTypeColors: Record<string, string> = {
    'Cod': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Lege': 'bg-green-500/10 text-green-500 border-green-500/20',
    'OG': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'OUG': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'Constituție': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'default': 'bg-muted text-muted-foreground'
};

export default function LegalActs() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedActId, setSelectedActId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);

    // Fetch acts list
    const { data: actsData, isLoading: actsLoading } = useQuery<ActsResponse>({
        queryKey: ['/api/legal-acts', searchQuery, filterType],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchQuery) params.set('search', searchQuery);
            if (filterType) params.set('actType', filterType);
            const res = await fetch(`/api/legal-acts?${params.toString()}`);
            return res.json();
        }
    });

    // Fetch stats
    const { data: statsData } = useQuery<StatsResponse>({
        queryKey: ['/api/legal-acts-stats']
    });

    // Fetch selected act details
    const { data: actDetail, isLoading: detailLoading } = useQuery<ActDetailResponse>({
        queryKey: ['/api/legal-acts', selectedActId],
        queryFn: async () => {
            if (!selectedActId) return null;
            const res = await fetch(`/api/legal-acts/${selectedActId}`);
            return res.json();
        },
        enabled: !!selectedActId
    });

    const acts = actsData?.acts || [];
    const stats = statsData?.byType || {};

    const getActIcon = (actType: string | null) => {
        const Icon = actTypeIcons[actType || 'default'] || actTypeIcons.default;
        return Icon;
    };

    const getActColor = (actType: string | null) => {
        return actTypeColors[actType || 'default'] || actTypeColors.default;
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-primary" />
                    Legislație
                </h2>
                <p className="text-muted-foreground mt-1">
                    Coduri, legi și ordonanțe din baza de date ({statsData?.totalActs || 0} acte)
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(stats).map(([type, count]) => (
                    <Card
                        key={type}
                        className={`cursor-pointer transition-all hover:scale-105 ${filterType === type ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setFilterType(filterType === type ? null : type)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const Icon = getActIcon(type);
                                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                                })()}
                                <div>
                                    <p className="text-2xl font-bold">{count}</p>
                                    <p className="text-xs text-muted-foreground">{type}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search Bar */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Caută act legislativ (ex: 'Civil', 'Legea 303', 'Codul Penal')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="search-acts"
                    />
                </div>
                {(searchQuery || filterType) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSearchQuery(""); setFilterType(null); }}
                        data-testid="clear-search"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Șterge filtre
                    </Button>
                )}
            </div>

            {/* Active Filter Badge */}
            {filterType && (
                <Badge variant="secondary" className="text-sm">
                    Filtru: {filterType}
                    <X
                        className="h-3 w-3 ml-2 cursor-pointer"
                        onClick={() => setFilterType(null)}
                    />
                </Badge>
            )}

            {/* Acts List */}
            <div className="space-y-3">
                {actsLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : acts.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {searchQuery || filterType
                                    ? 'Nu s-au găsit acte pentru criteriile selectate'
                                    : 'Nu există acte legislative în baza de date'
                                }
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    acts.map((act) => {
                        const Icon = getActIcon(act.actType);
                        const colorClass = getActColor(act.actType);

                        return (
                            <Card
                                key={act.id}
                                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                                onClick={() => setSelectedActId(act.id)}
                                data-testid={`act-card-${act.id}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate">
                                                {act.actTitle || 'Titlu necunoscut'}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                {act.actType && (
                                                    <Badge variant="outline" className={`text-xs ${colorClass}`}>
                                                        {act.actType}
                                                    </Badge>
                                                )}
                                                {act.actNumber && (
                                                    <span>Nr. {act.actNumber}</span>
                                                )}
                                                {act.publishedInMO && (
                                                    <span className="truncate">• {act.publishedInMO}</span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedActId} onOpenChange={(open) => !open && setSelectedActId(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {actDetail?.act && (
                                <>
                                    {(() => {
                                        const Icon = getActIcon(actDetail.act.actType);
                                        return <Icon className="h-6 w-6 text-primary" />;
                                    })()}
                                    {actDetail.act.actTitle}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {actDetail?.act?.actType} {actDetail?.act?.actNumber && `nr. ${actDetail.act.actNumber}`}
                            {actDetail?.act?.publishedInMO && ` • ${actDetail.act.publishedInMO}`}
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="space-y-3 p-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    ) : actDetail?.act?.fullText ? (
                        <ScrollArea className="h-[60vh] pr-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                {actDetail.act.fullText}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            Textul complet nu este disponibil
                        </p>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                        {actDetail?.act?.sourceUrl && (
                            <Button
                                variant="outline"
                                onClick={() => window.open(actDetail.act.sourceUrl!, '_blank')}
                                data-testid="view-source"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Vezi sursa oficială
                            </Button>
                        )}
                        <Button variant="default" onClick={() => setSelectedActId(null)}>
                            Închide
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
