import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  BookOpen,
  Scale,
  Sparkles,
  Trash2,
  Eye,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UploadedDocument } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const documentTypeLabels: Record<string, string> = {
  'tematica': 'Tematică Examen',
  'bibliografie': 'Bibliografie',
  'subiecte': 'Subiecte Anterioare',
  'cod': 'Cod/Lege',
  'curs': 'Curs/Manual'
};

const subjectLabels: Record<string, string> = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal',
  'general': 'General (toate materiile)'
};

export default function Documents() {
  const { toast } = useToast();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery<UploadedDocument[]>({
    queryKey: ['/api/documents'],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !documentType || !subject) {
        throw new Error("Completează toate câmpurile");
      }

      setIsUploading(true);
      console.log("[UPLOAD] Starting upload...", uploadFile.name, uploadFile.size);

      // Convert file to base64 for upload
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          console.log("[UPLOAD] Base64 ready, length:", base64.length);
          resolve(base64.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = (e) => {
          console.error("[UPLOAD] FileReader error:", e);
          reject(e);
        };
        reader.readAsDataURL(uploadFile);
      });

      const base64Content = await base64Promise;
      console.log("[UPLOAD] Sending to server, content length:", base64Content.length);

      // Upload and process in single request
      try {
        const processResponse = await apiRequest('POST', '/api/documents/upload', {
          fileName: uploadFile.name,
          documentType,
          subject,
          fileContent: base64Content
        });
        console.log("[UPLOAD] Response received");
        return processResponse.json();
      } catch (err) {
        console.error("[UPLOAD] API error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Document încărcat cu succes!",
        description: "AI a procesat documentul și l-a analizat.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setUploadFile(null);
      setDocumentType('');
      setSubject('');
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la încărcare",
        description: error.message,
        variant: "destructive"
      });
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/documents/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Document șters",
        description: "Documentul a fost eliminat din bibliotecă.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    }
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="ghost" size="icon" data-testid="back-to-library">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Bibliotecă Digitală
            </h1>
            <p className="text-muted-foreground">
              Încarcă tematici, subiecte anterioare și materiale pentru analiza AI
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Încarcă Document Nou
          </CardTitle>
          <CardDescription>
            PDF-uri cu tematici, bibliografie, subiecte 2019-2024, coduri sau cursuri
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Fișier PDF</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                data-testid="file-input"
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground" data-testid="file-name">
                  Selectat: {uploadFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-type">Tip Document</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="document-type" data-testid="select-document-type">
                  <SelectValue placeholder="Alege tipul..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Materie</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="subject" data-testid="select-subject">
                  <SelectValue placeholder="Alege materia..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(subjectLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!uploadFile || !documentType || !subject || isUploading}
            className="w-full"
            data-testid="upload-button"
          >
            {isUploading ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                AI procesează documentul...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Încarcă și Procesează cu AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Documente Încărcate</h2>
        
        {isLoading ? (
          <p className="text-muted-foreground">Se încarcă documentele...</p>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Niciun document încărcat. Adaugă tematici și subiecte anterioare pentru analiza AI.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} data-testid={`document-card-${doc.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg" data-testid={`doc-name-${doc.id}`}>
                          {doc.fileName}
                        </h3>
                      </div>
                      
                      <div className="flex gap-2">
                        <Badge variant="outline" data-testid={`doc-type-${doc.id}`}>
                          {documentTypeLabels[doc.documentType]}
                        </Badge>
                        <Badge variant="secondary" data-testid={`doc-subject-${doc.id}`}>
                          {subjectLabels[doc.subject] || doc.subject}
                        </Badge>
                      </div>

                      {doc.aiSummary && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-purple-500 mb-1">Rezumat AI:</p>
                              <p className="text-sm" data-testid={`doc-summary-${doc.id}`}>
                                {doc.aiSummary}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Încărcat: {new Date(doc.uploadedAt).toLocaleString('ro-RO')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        data-testid={`delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
