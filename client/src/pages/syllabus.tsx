
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Topic = {
    id: string;
    subject: string;
    topicName: string;
    description: string;
};

export default function Syllabus() {
    const { data: topics, isLoading } = useQuery<Topic[]>({
        queryKey: ["/api/question-topics"],
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Group topics by subject
    const groupedTopics = topics?.reduce((acc, topic) => {
        const subject = topic.subject;
        if (!acc[subject]) {
            acc[subject] = [];
        }
        acc[subject].push(topic);
        return acc;
    }, {} as Record<string, Topic[]>) || {};

    const subjectLabels: Record<string, string> = {
        "civil": "Drept Civil",
        "civil-procedural": "Drept Procesual Civil",
        "penal": "Drept Penal",
        "penal-procedural": "Drept Procesual Penal"
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Tematică Examen</h1>
                <p className="text-muted-foreground">
                    Structura detaliată a materiei pentru concursul INM 2025.
                </p>
            </div>

            <div className="grid gap-6">
                {Object.entries(groupedTopics).map(([subject, subjectTopics]) => (
                    <Card key={subject}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {subjectLabels[subject] || subject}
                                <Badge variant="secondary">{subjectTopics.length} teme</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px] w-full pr-4">
                                <Accordion type="single" collapsible className="w-full">
                                    {subjectTopics.map((topic, index) => (
                                        <AccordionItem key={topic.id} value={topic.id}>
                                            <AccordionTrigger className="text-left text-sm hover:no-underline hover:bg-muted/50 px-2 rounded-sm">
                                                <span className="truncate mr-2">{topic.topicName}</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 py-2 text-sm text-muted-foreground bg-muted/20 rounded-md mt-1">
                                                <div className="font-semibold mb-1">Context:</div>
                                                {topic.description}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
