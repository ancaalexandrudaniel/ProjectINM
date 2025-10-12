import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, FileText, Sparkles, Brain } from "lucide-react";

interface Citation {
  chunkId: string;
  text: string;
  similarity: number;
  metadata: {
    documentType?: string;
    subject?: string;
    fileName?: string;
  };
}

interface RAGResponse {
  question: string;
  answer: string;
  citations: Citation[];
  chunksRetrieved: number;
}

export default function LegalAssistant() {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<Array<{ question: string; answer: string; citations: Citation[] }>>([]);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await apiRequest("POST", "/api/legal-assistant/ask", { question: q, topK: 5 });
      const data = await response.json() as RAGResponse;
      return data;
    },
    onSuccess: (data) => {
      setConversation(prev => [...prev, {
        question: data.question,
        answer: data.answer,
        citations: data.citations
      }]);
      setQuestion("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    askMutation.mutate(question.trim());
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 md:p-6">
      {/* Header HUD */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-transparent h-[2px]" />
          <div className="flex items-center gap-3 pt-3">
            <Brain className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider uppercase text-cyan-400">
              Asistent Juridic AI
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">
            Pune întrebări despre legislație și primește răspunsuri bazate pe documentele tale
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Messages */}
          <div className="space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto pr-2">
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Sparkles className="w-16 h-16 text-cyan-400/50 mb-4" />
                <h3 className="text-xl text-gray-400 mb-2">Începe conversația</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Pune o întrebare despre legislație și voi căuta prin documentele tale pentru a-ți oferi un răspuns precis
                </p>
              </div>
            ) : (
              conversation.map((item, idx) => (
                <div key={idx} className="space-y-3">
                  {/* User Question */}
                  <div className="flex justify-end" data-testid={`question-${idx}`}>
                    <div className="max-w-[80%] bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-l-4 border-cyan-400 p-4 rounded-r-lg">
                      <p className="text-sm font-semibold text-cyan-300 mb-1">Întrebarea ta</p>
                      <p className="text-gray-100">{item.question}</p>
                    </div>
                  </div>

                  {/* AI Answer */}
                  <div className="flex justify-start" data-testid={`answer-${idx}`}>
                    <div className="max-w-[85%] bg-[#0a0e1a] border-2 border-gray-700/50 p-4 rounded-lg shadow-[0_0_20px_rgba(0,212,255,0.15)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Răspuns AI</p>
                      </div>
                      <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                      
                      {/* Citations */}
                      {item.citations && item.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-700/50">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Surse ({item.citations.length})
                          </p>
                          <div className="space-y-2">
                            {item.citations.slice(0, 3).map((citation, cidx) => (
                              <div 
                                key={cidx} 
                                className="text-xs bg-gray-800/30 p-2 rounded border-l-2 border-cyan-500/30"
                                data-testid={`citation-${idx}-${cidx}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-400">
                                    {citation.metadata?.fileName || "Document"}
                                  </span>
                                  <span className="text-cyan-400 font-mono">
                                    {(citation.similarity * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-gray-500 line-clamp-2">{citation.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Form */}
          <Card className="bg-[#0a0e1a] border-2 border-gray-700/50 p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Pune o întrebare despre legislație... (ex: Ce este capacitatea de exercițiu?)"
                className="min-h-[100px] bg-transparent border-2 border-cyan-500/30 focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(0,212,255,0.3)] text-gray-100 resize-none"
                disabled={askMutation.isPending}
                data-testid="input-question"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {askMutation.isPending && "Se caută prin documente..."}
                </p>
                <Button
                  type="submit"
                  disabled={!question.trim() || askMutation.isPending}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold uppercase tracking-wider shadow-[0_0_20px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit"
                >
                  {askMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesez
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Întreabă
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <Card className="bg-[#0a0e1a] border-2 border-gray-700/50 p-4 shadow-[0_0_20px_rgba(0,212,255,0.1)]">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Cum funcționează</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">1.</span>
                <span>Pune o întrebare despre legislație</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">2.</span>
                <span>AI caută prin documentele tale uploadate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">3.</span>
                <span>Primești răspuns bazat pe surse autentice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">4.</span>
                <span>Vezi citatele exacte din documente</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-2 border-cyan-500/30 p-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-cyan-400 font-semibold">💡 Sfat:</span> Pentru rezultate optime, asigură-te că ai uploadat documentele tale juridice și ai generat embeddings pentru ele.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
