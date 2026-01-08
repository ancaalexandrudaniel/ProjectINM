
import fs from 'fs';

// Mapping of Mojibake characters to Romanian diacritics
const REPLACEMENTS: Record<string, string> = {
    '╚Ö': 'ș',
    '┼ƒ': 'ș',
    '╚¢': 'ț',
    '┼ú': 'ț',
    '├ó': 'â',
    '─â': 'ă',
    '├«': 'î',
    'ΓÇô': '-',
    '─é': 'ă', // TEMATIC─é -> TEMATICĂ (usually)
    'Ă': 'Ă', // Just in case
    // Add more as discovered
};

function cleanText(text: string): string {
    let cleaned = text;
    // Apply replacements
    for (const [bad, good] of Object.entries(REPLACEMENTS)) {
        cleaned = cleaned.split(bad).join(good);
    }

    // Remove page headers/footers
    // Pattern: "-- X of Y --" or "Institutul National..." address blocks
    const lines = cleaned.split('\n');
    const filteredLines = lines.filter(line => {
        const l = line.trim();
        if (l.match(/^-- \d+ of \d+ --$/)) return false;
        if (l.includes("Institutul Național al Magistraturii")) return false;
        if (l.includes("București, B-dul Regina Elisabeta")) return false;
        if (l.includes("Operator de date cu caracter personal")) return false;
        if (l.includes("www.inm-lex.ro")) return false;
        if (l.match(/^\d+$/) && l.length < 3) return false; // Likely page numbers
        return true;
    });

    return filteredLines.join('\n');
}

interface SyllabusItem {
    id: string;
    title: string;
    children?: SyllabusItem[];
}

function parseSyllabus(text: string) {
    const lines = text.split('\n');
    const result: SyllabusItem[] = [];

    // Main sections
    const DISCIPLINES = [
        "DREPT CIVIL",
        "DREPT PROCESUAL CIVIL",
        "DREPT PENAL",
        "DREPT PROCESUAL PENAL"
    ];

    let currentDiscipline: SyllabusItem | null = null;
    let currentStack: SyllabusItem[] = []; // To track hierarchy

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Check for Discipline Header
        const disciplineIndex = DISCIPLINES.indexOf(line.toUpperCase());
        if (disciplineIndex !== -1) {
            currentDiscipline = {
                id: `disc-${disciplineIndex}`,
                title: DISCIPLINES[disciplineIndex],
                children: []
            };
            result.push(currentDiscipline);
            currentStack = [currentDiscipline];
            continue;
        }

        if (!currentDiscipline) continue; // Skip text before first discipline

        // Simple hierarchy based on indentation or numbering would be ideal, 
        // but PDF text extraction flattens it. We rely on numbering patterns.

        // Roman Numerals (I., II., IV.) -> Level 1
        const romanMatch = line.match(/^([IVX]+)\.\s+(.*)/);
        if (romanMatch) {
            const item: SyllabusItem = {
                id: `${currentDiscipline.id}-${romanMatch[1]}`,
                title: line,
                children: []
            };
            // Reset stack to Discipline level then push this
            currentStack = [currentDiscipline, item];
            currentDiscipline.children!.push(item);
            continue;
        }

        // Arabic Numerals (1., 2., 15.) -> Level 2
        const arabicMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (arabicMatch) {
            const item: SyllabusItem = {
                id: `${currentStack[currentStack.length - 1]?.id || currentDiscipline.id}-${arabicMatch[1]}`,
                title: line,
                children: []
            };
            // If current top is Level 2 (starts with digit), pop it to replace with sibling
            // If current top is Level 1 (Roman), push this as child.

            // Heuristic: Check the parent.
            // If the last added item was a Roman Numeral, we are starting a list of Arabic numerals.
            // If the last added item was an Arabic Numeral, we are adding a sibling.

            // Robust approach: Look at the stack.
            // Stack[0] = Discipline
            // Stack[1] = Roman (e.g. "I. Constituția")
            // Stack[2] = Arabic (e.g. "1. Titlul preliminar")

            if (currentStack.length >= 3) {
                // We are at Level 2 or deeper. Pop to level 2 (keep Discipline + Roman)
                while (currentStack.length > 2) currentStack.pop();
            }

            // Now ensure we have a Roman parent (Level 1)
            if (currentStack.length < 2) {
                // Orphan Arabic numeral? Attach to discipline directly or create dummy?
                // For now, attach to stack top.
            }

            const parent = currentStack[currentStack.length - 1];
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(item);
                currentStack.push(item);
            }
            continue;
        }

        // Bullets or Sub-points (- or a)) -> Level 3
        if (line.startsWith('-') || line.match(/^[a-z]\)\s+/)) {
            const item: SyllabusItem = {
                id: `sub-${Math.random().toString(36).substr(2, 5)}`,
                title: line,
            };
            // Attach to whatever is currently properly on top (Discipline, Roman, or Arabic)
            const parent = currentStack[currentStack.length - 1];
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(item);
            }
            continue;
        }

        // Continuation lines? 
        // If a line doesn't match a pattern, append to previous item's title? 
        // Or treating as separate sub-item?
        // For now, let's treat as separate item if it looks substantial, or append if it's lower case?
        if (currentStack.length > 0) {
            const parent = currentStack[currentStack.length - 1];
            // Append to last child of parent if exists
            if (parent.children && parent.children.length > 0) {
                const lastChild = parent.children[parent.children.length - 1];
                lastChild.title += " " + line;
            } else {
                // Append to parent title?? No, usually title is one line.
                // Maybe it is a new sub-item without bullet
                const item: SyllabusItem = {
                    id: `cont-${Math.random().toString(36).substr(2, 5)}`,
                    title: line,
                };
                parent.children = parent.children || [];
                parent.children.push(item);
            }
        }
    }

    return result;
}

const rawText = fs.readFileSync('tematica_text.txt', 'utf16le');
const cleanedText = cleanText(rawText);

// Save cleaned text for debugging
fs.writeFileSync('tematica_clean.txt', cleanedText);

const syllabus = parseSyllabus(cleanedText);
fs.writeFileSync('syllabus.json', JSON.stringify(syllabus, null, 2));

console.log("Parsing complete. Generated syllabus.json");
