import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CheckCircle2, AlertCircle, BookOpen, PenTool, Scale, ListChecks } from "lucide-react";
import { WorkflowState, INITIAL_WORKFLOW_STATE } from "./types";

interface CaseWorkflowProps {
    requirementId: string;
    initialData?: Partial<WorkflowState>;
    onSave: (data: WorkflowState) => void;
    onDraftChange: (text: string) => void;
}

export function CaseWorkflow({ requirementId, initialData, onSave, onDraftChange }: CaseWorkflowProps) {
    const [state, setState] = useState<WorkflowState>({
        ...INITIAL_WORKFLOW_STATE,
        ...initialData
    });

    const [activeTab, setActiveTab] = useState("analysis");

    // Auto-save wrapper
    const updateState = (updates: Partial<WorkflowState>) => {
        const newState = { ...state, ...updates };
        setState(newState);
        onSave(newState);

        if (updates.draft !== undefined) {
            onDraftChange(updates.draft);
        }
    };

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                    <TabsTrigger value="analysis" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Analiză
                    </TabsTrigger>
                    <TabsTrigger value="issues" className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Probleme
                    </TabsTrigger>
                    <TabsTrigger value="plan" className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> Plan
                    </TabsTrigger>
                    <TabsTrigger value="write" className="flex items-center gap-2">
                        <PenTool className="h-4 w-4" /> Redactare
                    </TabsTrigger>
                    <TabsTrigger value="verify" className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Verificare
                    </TabsTrigger>
                </TabsList>

                {/* Step 1: Analysis */}
                <TabsContent value="analysis" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <Label>Notițe & Ciornă</Label>
                                <Textarea
                                    className="min-h-[300px]"
                                    placeholder="Notează idei principale, fapte relevante, date calendaristice..."
                                    value={state.analysis.notes}
                                    onChange={(e) => updateState({
                                        analysis: { ...state.analysis, notes: e.target.value }
                                    })}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <Label>Identificare Părți</Label>
                                <div className="space-y-2">
                                    {state.analysis.parties.map((party, idx) => (
                                        <div key={party.id} className="flex gap-2">
                                            <Input
                                                value={party.name}
                                                placeholder="Nume (ex: Popescu)"
                                                onChange={(e) => {
                                                    const newParties = [...state.analysis.parties];
                                                    newParties[idx].name = e.target.value;
                                                    updateState({
                                                        analysis: { ...state.analysis, parties: newParties }
                                                    });
                                                }}
                                            />
                                            <Input
                                                value={party.role}
                                                placeholder="Rol (ex: Reclamant)"
                                                className="w-32"
                                                onChange={(e) => {
                                                    const newParties = [...state.analysis.parties];
                                                    newParties[idx].role = e.target.value;
                                                    updateState({
                                                        analysis: { ...state.analysis, parties: newParties }
                                                    });
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    const newParties = state.analysis.parties.filter((_, i) => i !== idx);
                                                    updateState({
                                                        analysis: { ...state.analysis, parties: newParties }
                                                    });
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            const newParties = [...state.analysis.parties, { id: crypto.randomUUID(), name: '', role: '' }];
                                            updateState({
                                                analysis: { ...state.analysis, parties: newParties }
                                            });
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Adaugă Parte
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Step 2: Issues */}
                <TabsContent value="issues" className="space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-lg">Probleme de Drept Identificate</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const newIssues = [...state.issues, { id: crypto.randomUUID(), text: '', relevantLaw: '' }];
                                        updateState({ issues: newIssues });
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Adaugă Problemă
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {state.issues.length === 0 && (
                                    <p className="text-muted-foreground text-center py-8 italic">
                                        Nu ai adăugat nicio problemă juridică încă. Identifică problemele din speță pentru a structura răspunsul.
                                    </p>
                                )}
                                {state.issues.map((issue, idx) => (
                                    <Card key={issue.id} className="bg-muted/30">
                                        <CardContent className="p-3 flex gap-3 items-start">
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    placeholder="Descrierea problemei (ex: Îndeplinirea condițiilor viciului ascuns)"
                                                    value={issue.text}
                                                    onChange={(e) => {
                                                        const newIssues = [...state.issues];
                                                        newIssues[idx].text = e.target.value;
                                                        updateState({ issues: newIssues });
                                                    }}
                                                />
                                                <Input
                                                    placeholder="Temei legal relevant (ex: art. 1707 Cod Civil)"
                                                    className="font-mono text-xs"
                                                    value={issue.relevantLaw}
                                                    onChange={(e) => {
                                                        const newIssues = [...state.issues];
                                                        newIssues[idx].relevantLaw = e.target.value;
                                                        updateState({ issues: newIssues });
                                                    }}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    const newIssues = state.issues.filter((_, i) => i !== idx);
                                                    updateState({ issues: newIssues });
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Step 3: Plan */}
                <TabsContent value="plan" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {state.plan.map((section, idx) => (
                            <Card key={section.id}>
                                <CardContent className="p-4 space-y-2">
                                    <Label className="font-bold text-purple-400">{section.title}</Label>
                                    <Textarea
                                        value={section.content}
                                        onChange={(e) => {
                                            const newPlan = [...state.plan];
                                            newPlan[idx].content = e.target.value;
                                            updateState({ plan: newPlan });
                                        }}
                                        placeholder={`Schițează ideile pentru ${section.title.toLowerCase()}...`}
                                        className="min-h-[100px]"
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Step 4: Write */}
                <TabsContent value="write" className="space-y-4">
                    <div className="flex justify-between items-center bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                        <div className="flex items-center gap-2">
                            <PenTool className="h-5 w-5 text-purple-400" />
                            <span className="text-sm font-medium">Redactare Finală</span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                const planText = state.plan
                                    .filter(p => p.content.trim())
                                    .map(p => `### ${p.title}\n${p.content}`)
                                    .join('\n\n');

                                const newDraft = state.draft
                                    ? `${state.draft}\n\n${planText}`
                                    : planText;

                                updateState({ draft: newDraft });
                            }}
                            title="Adaugă conținutul din plan în editor"
                        >
                            <ListChecks className="h-4 w-4 mr-2" />
                            Importă din Plan
                        </Button>
                    </div>

                    <Textarea
                        value={state.draft}
                        onChange={(e) => updateState({ draft: e.target.value })}
                        placeholder="Redactează răspunsul final aici..."
                        className="min-h-[400px] font-mono text-sm leading-relaxed p-6"
                    />
                </TabsContent>

                {/* Step 5: Verify */}
                <TabsContent value="verify" className="space-y-4">
                    <Card className={state.verified ? "border-green-500/50 bg-green-500/5" : ""}>
                        <CardContent className="p-6 text-center space-y-4">
                            <h3 className="text-lg font-semibold">Checklist Final</h3>
                            <div className="space-y-2 text-left max-w-md mx-auto">
                                {[
                                    "Am identificat corect problema de drept?",
                                    "Am indicat temeiul legal aplicabil?",
                                    "Am aplicat legea la situația de fapt din speță?",
                                    "Am formulat o concluzie clară (Da/Nu/Soluția)?"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                                        <div className="h-4 w-4 rounded border border-primary" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                size="lg"
                                variant={state.verified ? "default" : "outline"}
                                className={state.verified ? "bg-green-600 hover:bg-green-700" : ""}
                                onClick={() => updateState({ verified: !state.verified })}
                            >
                                <CheckCircle2 className="h-5 w-5 mr-2" />
                                {state.verified ? "Lucrare Verificată" : "Marchează ca Verificat"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
