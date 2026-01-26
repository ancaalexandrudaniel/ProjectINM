export interface CaseParty {
    id: string;
    name: string;
    role: string; // 'reclamant', 'pârât', 'instanță', etc.
}

export interface CaseIssue {
    id: string;
    text: string;
    relevantLaw: string;
}

export interface CasePlanSection {
    id: string;
    title: string; // 'Introducere', 'Argumente', 'Soluție'
    content: string;
}

export interface CaseAnalysis {
    notes: string;
    parties: CaseParty[];
    keyFacts: string[];
}

export interface WorkflowState {
    analysis: CaseAnalysis;
    issues: CaseIssue[];
    plan: CasePlanSection[];
    draft: string; // The final text in the editor
    verified: boolean;
}

export const INITIAL_WORKFLOW_STATE: WorkflowState = {
    analysis: {
        notes: '',
        parties: [],
        keyFacts: []
    },
    issues: [],
    plan: [
        { id: 'intro', title: 'Introducere & Context', content: '' },
        { id: 'args-pro', title: 'Argumente Principale', content: '' },
        { id: 'args-con', title: 'Contra-argumente / Apărări', content: '' },
        { id: 'solution', title: 'Soluție Propusă', content: '' }
    ],
    draft: '',
    verified: false
};
