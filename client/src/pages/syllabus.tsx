import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Loader2,
    Scale,
    FileText,
    Shield,
    Gavel,
    ChevronRight,
    BookOpen,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    BookMarked,
    FileQuestion,
    GraduationCap,
    Sparkles,
    Zap,
    ShieldCheck,
    History
} from "lucide-react";

interface SyllabusTopic {
    id: string;
    syllabusId: string;
    subject: string;
    topicTitle: string;
    parentId: string | null;
    depth: number;
    sortOrder: number;
    articleRefs: string[] | null;
    articleRangeStart: number | null;
    articleRangeEnd: number | null;
    chapterPatterns: string[] | null;
    progressPercent: number;
    hasArticles: boolean;
    totalQuestions: number;
    totalArticles: number;
}

interface TopicContent {
    topic: {
        id: string;
        syllabusId: string;
        title: string;
        subject: string;
        articleRefs: string[] | null;
    };
    content: {
        articles: Array<{
            id: string;
            articleNumber: number;
            title: string;
            segments: Record<string, string>;
            lawSource: string;
        }>;
        articlesCount: number;
        questions: Array<{
            id: string;
            questionText: string;
            chapter: string;
            difficulty: string;
        }>;
        questionsCount: number;
    };
    segmentTypes: string[];
}

interface TopicsResponse {
    topics: SyllabusTopic[];
    rootTopics: string[];
    stats: {
        totalTopics: number;
        bySubject: Record<string, number>;
    };
}

const subjectConfig = {
    civil: { label: "Drept Civil", icon: Scale, color: "text-blue-600" },
    "civil-procedural": { label: "Drept Procesual Civil", icon: FileText, color: "text-green-600" },
    penal: { label: "Drept Penal", icon: Shield, color: "text-red-600" },
    "penal-procedural": { label: "Drept Procesual Penal", icon: Gavel, color: "text-purple-600" },
};

const segmentLabels: Record<string, { label: string; icon: string; color: string }> = {
    official: { label: "📜 Text Oficial", icon: "📜", color: "bg-slate-100" },
    trad: { label: "💡 Explicație Simplificată", icon: "💡", color: "bg-yellow-50" },
    puncte: { label: "⚠️ Puncte-Cheie & Capcane", icon: "⚠️", color: "bg-orange-50" },
    juris: { label: "⚖️ Jurisprudență Relevantă", icon: "⚖️", color: "bg-blue-50" },
    radar: { label: "🎯 Ce Apare la Examen", icon: "🎯", color: "bg-red-50" },
    logica: { label: "🧠 Logica Articolului", icon: "🧠", color: "bg-purple-50" },
    conex: { label: "🔗 Conexiuni", icon: "🔗", color: "bg-green-50" },
};

export default function Syllabus() {
    const [selectedSubject, setSelectedSubject] = useState<string>("civil");
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"overview" | "content">("overview");

    // Fetch all syllabus topics
    const { data: topicsData, isLoading } = useQuery<TopicsResponse>({
        queryKey: ["/api/syllabus-topics", selectedSubject],
        queryFn: async () => {
            const res = await fetch(`/api/syllabus-topics?subject=${selectedSubject}`);
            return res.json();
        },
    });

    // Fetch topic content when selected
    const { data: topicContent, isLoading: contentLoading } = useQuery<TopicContent>({
        queryKey: ["/api/syllabus-topics", selectedTopicId, "content"],
        queryFn: async () => {
            const res = await fetch(`/api/syllabus-topics/${selectedTopicId}/content`);
            return res.json();
        },
        enabled: !!selectedTopicId && viewMode === "content",
    });

    // Build tree structure from flat topics
    const buildTree = (topics: SyllabusTopic[]) => {
        const rootTopics = topics.filter(t => t.depth === 0);

        const getChildren = (parentId: string): SyllabusTopic[] => {
            return topics.filter(t => t.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
        };

        return { rootTopics, getChildren };
    };

    const handleTopicClick = (topic: SyllabusTopic) => {
        setSelectedTopicId(topic.syllabusId);
        if (topic.hasArticles || topic.depth >= 2) {
            setViewMode("content");
        }
    };

    const handleBackToOverview = () => {
        setViewMode("overview");
        setSelectedTopicId(null);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                {/* Animated loading skeleton */}
                <div className="flex flex-col gap-2 animate-pulse">
                    <Skeleton className="h-9 w-96" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-10 w-full" style={{ animationDelay: `${i * 100}ms` }} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const topics = topicsData?.topics || [];
    const { rootTopics, getChildren } = buildTree(topics);
    const SubjectIcon = subjectConfig[selectedSubject as keyof typeof subjectConfig]?.icon || Scale;

    // Topic Tree Node Component with animations
    const TopicNode = ({ topic, level = 0 }: { topic: SyllabusTopic; level?: number }) => {
        const children = getChildren(topic.syllabusId);
        const hasChildren = children.length > 0;
        const progressColor = topic.progressPercent >= 70 ? "bg-green-500" : topic.progressPercent >= 30 ? "bg-yellow-500" : "bg-red-400";

        return (
            <AccordionItem value={topic.syllabusId} className="border-none transition-all duration-200">
                <div className="flex items-center gap-2 group">
                    <AccordionTrigger
                        className={`flex-1 text-left text-sm hover:no-underline hover:bg-gradient-to-r hover:from-muted/80 hover:to-transparent px-3 py-2.5 rounded-lg transition-all duration-200 ${level === 0 ? 'font-semibold text-base' : ''
                            }`}
                        onClick={(e) => {
                            if (!hasChildren) {
                                e.preventDefault();
                                handleTopicClick(topic);
                            }
                        }}
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {topic.hasArticles && (
                                <BookMarked className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                            <span className="truncate">{topic.topicTitle}</span>
                            {topic.progressPercent > 0 && (
                                <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                                    {topic.progressPercent}%
                                </Badge>
                            )}
                        </div>
                    </AccordionTrigger>
                    {!hasChildren && topic.hasArticles && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleTopicClick(topic)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {hasChildren && (
                    <AccordionContent className="pl-4 pt-0 pb-2">
                        <div className="border-l-2 border-muted pl-2">
                            <Accordion type="multiple" className="w-full">
                                {children.map(child => (
                                    <TopicNode key={child.syllabusId} topic={child} level={level + 1} />
                                ))}
                            </Accordion>
                        </div>
                    </AccordionContent>
                )}
            </AccordionItem>
        );
    };

    // Content View for selected topic
    const TopicContentView = () => {
        if (contentLoading) {
            return (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }

        if (!topicContent) {
            return (
                <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nu s-a putut încărca conținutul pentru acest topic.</p>
                </div>
            );
        }

        const { topic, content, segmentTypes } = topicContent;

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <Button variant="ghost" size="sm" onClick={handleBackToOverview} className="mb-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Înapoi la tematică
                        </Button>
                        <h2 className="text-2xl font-bold">{topic.title}</h2>
                        {topic.articleRefs && (
                            <p className="text-muted-foreground mt-1">
                                Referințe: {(topic.articleRefs as string[]).join(", ")}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {content.articlesCount} articole
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <FileQuestion className="h-3 w-3" />
                            {content.questionsCount} întrebări
                        </Badge>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="articles" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="articles" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Articole Juridice ({content.articlesCount})
                        </TabsTrigger>
                        <TabsTrigger value="questions" className="flex items-center gap-2">
                            <FileQuestion className="h-4 w-4" />
                            Întrebări ({content.questionsCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="articles" className="mt-4">
                        {content.articles.length === 0 ? (
                            <Card className="border-dashed border-2">
                                <CardContent className="py-12 text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                        <Zap className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Conținut Disponibil pentru Generare</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Articolele pentru acest topic pot fi generate automat din surse oficiale.
                                    </p>
                                    <div className="flex flex-col gap-2 items-center">
                                        <Button className="gap-2">
                                            <Sparkles className="h-4 w-4" />
                                            Generează Conținut Clean Room
                                        </Button>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3" />
                                            Generat 100% din surse oficiale (legislatie.just.ro)
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {content.articles.map(article => (
                                    <Card key={article.id} className="overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    Art. {article.articleNumber}
                                                    <span className="font-normal text-muted-foreground">- {article.title}</span>
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Clean Room
                                                    </Badge>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Istoricul versiunilor">
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {article.lawSource && (
                                                <CardDescription>{article.lawSource}</CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <Accordion type="multiple" className="w-full">
                                                {segmentTypes.map(segmentKey => {
                                                    const segmentContent = article.segments?.[segmentKey];
                                                    if (!segmentContent) return null;

                                                    const segmentInfo = segmentLabels[segmentKey] || { label: segmentKey, icon: "📄", color: "bg-gray-50" };

                                                    return (
                                                        <AccordionItem key={segmentKey} value={segmentKey}>
                                                            <AccordionTrigger className={`${segmentInfo.color} px-3 rounded-md hover:no-underline`}>
                                                                <span className="flex items-center gap-2">
                                                                    <span>{segmentInfo.icon}</span>
                                                                    <span>{segmentInfo.label}</span>
                                                                </span>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-3 py-2 text-sm whitespace-pre-wrap">
                                                                {segmentContent}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    );
                                                })}
                                            </Accordion>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="questions" className="mt-4">
                        {content.questions.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Nu există întrebări pentru acest topic în baza de date.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {content.questions.map((q, idx) => (
                                    <Card key={q.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm">{q.questionText}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Badge variant="outline" className="text-xs">{q.chapter}</Badge>
                                                        <Badge
                                                            variant={q.difficulty === 'hard' ? 'destructive' : q.difficulty === 'medium' ? 'secondary' : 'default'}
                                                            className="text-xs"
                                                        >
                                                            {q.difficulty}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <GraduationCap className="h-8 w-8 text-primary" />
                    Tematică & Bibliografie INM 2025
                </h1>
                <p className="text-muted-foreground">
                    Explorează structura detaliată a materiei cu acces la conținut juridic, doctrină și întrebări de examen.
                </p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(subjectConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = topicsData?.stats?.bySubject?.[key] || 0;
                    const isActive = selectedSubject === key;

                    return (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 ${isActive ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : 'hover:ring-1 hover:ring-muted-foreground/20'}`}
                            onClick={() => {
                                setSelectedSubject(key);
                                setViewMode("overview");
                                setSelectedTopicId(null);
                            }}
                        >
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <Icon className={`h-5 w-5 ${config.color}`} />
                                    <div>
                                        <p className="text-sm font-medium">{config.label}</p>
                                        <p className="text-xs text-muted-foreground">{count} topice</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Main Content */}
            {viewMode === "overview" ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SubjectIcon className={`h-5 w-5 ${subjectConfig[selectedSubject as keyof typeof subjectConfig]?.color}`} />
                            {subjectConfig[selectedSubject as keyof typeof subjectConfig]?.label || selectedSubject}
                        </CardTitle>
                        <CardDescription>
                            Click pe un topic pentru a vedea conținutul juridic disponibil
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px] pr-4">
                            <Accordion type="multiple" className="w-full">
                                {rootTopics.map(topic => (
                                    <TopicNode key={topic.syllabusId} topic={topic} />
                                ))}
                            </Accordion>
                        </ScrollArea>
                    </CardContent>
                </Card>
            ) : (
                <TopicContentView />
            )}
        </div>
    );
}
