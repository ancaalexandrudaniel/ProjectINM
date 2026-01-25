
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Scale, Database, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ImportManagement() {
    const [, setLocation] = useLocation();
    const [isPurging, setIsPurging] = useState(false);
    const { toast } = useToast();

    const sections = [
        {
            title: "Import Întrebări Grilă",
            description: "Importați întrebări pentru testele grilă (JSON/CSV)",
            offset: "/bulk-import",
            icon: Upload
        },
        {
            title: "Import Spețe",
            description: "Adăugați spețe noi pentru Etapa I",
            offset: "/spete-import",
            icon: FileText
        },
        {
            title: "Import Articole Legale",
            description: "Actualizați baza de date legislativă",
            offset: "/legal-articles-import",
            icon: Scale
        },
        {
            title: "Import Subiecte Examen",
            description: "Încărcați PDF-uri scanate din examene anterioare",
            offset: "/exam-papers-import",
            icon: Database
        }
    ];

    const handlePurgeQuestions = async () => {
        setIsPurging(true);
        try {
            const res = await fetch("/api/admin/purge-questions", { method: "POST" });
            const data = await res.json();

            if (data.success) {
                toast({
                    title: "✅ Baza de date curățată",
                    description: "Toate întrebările au fost șterse. Poți reimporta acum.",
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: "❌ Eroare",
                description: "Nu s-au putut șterge întrebările. Verifică consola.",
                variant: "destructive"
            });
        } finally {
            setIsPurging(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        <Upload className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Import Centralizat</h1>
                        <p className="text-muted-foreground">Gestionați importul de date în aplicație</p>
                    </div>
                </div>

                {/* PURGE BUTTON */}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Șterge Toate Întrebările
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                                <AlertTriangle className="h-5 w-5" />
                                Confirmare Ștergere Totală
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Această acțiune va șterge <strong>TOATE întrebările</strong> din baza de date.
                                Nu se poate anula. După ștergere, vei putea reimporta datele curate.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Anulează</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handlePurgeQuestions}
                                disabled={isPurging}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isPurging ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Se șterge...
                                    </>
                                ) : (
                                    "Da, Șterge Tot"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                        <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(s.offset)}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="p-2 rounded-full bg-secondary">
                                    <Icon className="h-6 w-6 text-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">{s.title}</CardTitle>
                                    <CardDescription className="mt-1">{s.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full">
                                    Deschide Import
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
