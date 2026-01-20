import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
    Bell,
    CheckCircle,
    RefreshCw,
    FileText,
    Calendar,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Filter
} from "lucide-react";

// Types
interface ChangeItem {
    id: string;
    actName: string;
    actNumber: string;
    changeType: string;
    changeDescription: string | null;
    affectedArticles: string[] | null;
    detectedAt: string;
    isReviewed: boolean;
}

interface ChangesResponse {
    changes: ChangeItem[];
    count: number;
}

interface UnreviewedCountResponse {
    count: number;
}

export default function BulletinBoard() {
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterAct, setFilterAct] = useState<string>("all");
    const [showOnlyUnreviewed, setShowOnlyUnreviewed] = useState(false);

    // Build query URL
    const changesUrl = `/api/bulletin-board/changes?limit=50${showOnlyUnreviewed ? '&unreviewed=true' : ''}`;

    // Fetch changes using default queryFn
    const { data: changesData, isLoading, error } = useQuery<ChangesResponse>({
        queryKey: [changesUrl],
    });

    // Fetch unreviewed count
    const { data: unreviewedData } = useQuery<UnreviewedCountResponse>({
        queryKey: ['/api/bulletin-board/unreviewed-count'],
    });

    // Mark as reviewed mutation
    const markReviewedMutation = useMutation({
        mutationFn: async (changeId: string) => {
            const res = await fetch(`/api/bulletin-board/changes/${changeId}/review`, {
                method: 'POST',
                body: JSON.stringify({ notes: 'Reviewed via Bulletin Board' }),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to mark as reviewed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/bulletin-board'] });
        }
    });

    // Manual sync mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/bulletin-board/sync', {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Sync failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/bulletin-board'] });
        }
    });

    // Get unique acts for filter
    const uniqueActs: string[] = changesData?.changes
        ? Array.from(new Set(changesData.changes.map((c: ChangeItem) => c.actName)))
        : [];

    // Filter changes
    const filteredChanges: ChangeItem[] = changesData?.changes?.filter((change: ChangeItem) => {
        if (filterAct !== "all" && change.actName !== filterAct) return false;
        return true;
    }) || [];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ro-RO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getChangeTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'amendment': 'Modificare',
            'new_version': 'Versiune Nouă',
            'abrogation': 'Abrogare',
        };
        return labels[type] || type;
    };

    const getChangeTypeBadgeClass = (type: string) => {
        const classes: Record<string, string> = {
            'amendment': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
            'new_version': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            'abrogation': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="max-w-[1128px] mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <Bell className="h-8 w-8 text-primary" />
                        <h2 className="text-3xl font-bold text-foreground">Buletin Legislativ</h2>
                        {unreviewedData && unreviewedData.count > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-sm font-bold px-2.5 py-1 rounded-full">
                                {unreviewedData.count} noi
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Modificări legislative detectate automat în actele din bibliografie
                    </p>
                </div>
                <button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncMutation.isPending ? 'Verificare...' : 'Verifică Actualizări'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filtre:</span>
                    </div>

                    <select
                        value={filterAct}
                        onChange={(e) => setFilterAct(e.target.value)}
                        className="text-sm border border-border rounded-lg px-3 py-2 bg-background"
                    >
                        <option value="all">Toate actele</option>
                        {uniqueActs.map((act: string) => (
                            <option key={act} value={act}>{act}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showOnlyUnreviewed}
                            onChange={(e) => setShowOnlyUnreviewed(e.target.checked)}
                            className="rounded border-border"
                        />
                        <span className="text-sm">Doar nerevizuite</span>
                    </label>

                    <div className="flex-1" />

                    <span className="text-sm text-muted-foreground">
                        {filteredChanges.length} modificări găsite
                    </span>
                </div>
            </div>

            {/* Sync Status */}
            {syncMutation.isSuccess && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-success font-medium">
                        Sincronizare completă! Toate actele au fost verificate.
                    </span>
                </div>
            )}

            {/* Changes List */}
            {isLoading ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-muted-foreground">Se încarcă modificările...</p>
                </div>
            ) : error ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
                    <p className="text-destructive font-medium">Eroare la încărcarea modificărilor</p>
                </div>
            ) : filteredChanges.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nicio modificare detectată</h3>
                    <p className="text-muted-foreground">
                        Actele din bibliografie sunt la zi. Verificarea automată rulează săptămânal.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredChanges.map((change: ChangeItem) => (
                        <div
                            key={change.id}
                            className={`bg-card border rounded-lg shadow-sm overflow-hidden transition-all ${change.isReviewed
                                    ? 'border-border'
                                    : 'border-primary/50 ring-1 ring-primary/20'
                                }`}
                        >
                            {/* Change Header */}
                            <div
                                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <FileText className={`h-5 w-5 ${change.isReviewed ? 'text-muted-foreground' : 'text-primary'}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold">{change.actName}</h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getChangeTypeBadgeClass(change.changeType)}`}>
                                                    {getChangeTypeLabel(change.changeType)}
                                                </span>
                                                {!change.isReviewed && (
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                        NOU
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(change.detectedAt)}
                                                </span>
                                                {change.actNumber && (
                                                    <span>Nr. {change.actNumber}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!change.isReviewed && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markReviewedMutation.mutate(change.id);
                                                }}
                                                disabled={markReviewedMutation.isPending}
                                                className="text-sm text-primary hover:underline disabled:opacity-50"
                                            >
                                                Marchează revizuit
                                            </button>
                                        )}
                                        {expandedId === change.id ? (
                                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === change.id && (
                                <div className="border-t border-border p-4 bg-muted/30">
                                    {change.changeDescription && (
                                        <div className="mb-4">
                                            <h5 className="text-sm font-semibold mb-2">Descriere</h5>
                                            <p className="text-sm text-muted-foreground">
                                                {change.changeDescription}
                                            </p>
                                        </div>
                                    )}

                                    {change.affectedArticles && change.affectedArticles.length > 0 && (
                                        <div>
                                            <h5 className="text-sm font-semibold mb-2">Articole Afectate</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {change.affectedArticles.map((article: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm"
                                                    >
                                                        {article}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-border">
                                        <p className="text-xs text-muted-foreground italic">
                                            Vizualizarea completă a diferențelor va fi disponibilă în versiunea viitoare.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <h4 className="font-semibold mb-2">Despre Buletinul Legislativ</h4>
                <p className="text-sm text-muted-foreground">
                    Platforma verifică automat săptămânal toate actele din bibliografia INM 2025
                    pentru a detecta modificările legislative. Când o modificare este găsită,
                    articolele afectate sunt evidențiate aici pentru revizuire.
                </p>
            </div>
        </div>
    );
}
