# INM Mentor - Audit de Conformitate și Proprietate Intelectuală

**Versiune**: 1.0  
**Data**: 2026-01-22  
**Status**: Document de referință pentru conformitate juridică

---

## 1. Declarație de Conformitate

Platforma INM Mentor generează conținut educațional juridic respectând integral legislația română privind drepturile de autor și proprietatea intelectuală.

### 1.1 Cadrul Legal Aplicabil

| Act Normativ | Prevedere Relevantă | Aplicare în Platformă |
|-------------|--------------------|-----------------------|
| **Legea 8/1996** (Art. 9 lit. b) | Textele oficiale de natură legislativă sunt **excluse de la protecția dreptului de autor** | Folosim exclusiv texte legislative oficiale ca sursă primară |
| **Legea 109/2007** (PSI Directive) | Informațiile publice trebuie puse la dispoziție în format reutilizabil | Accesăm date de pe portaluri guvernamentale (legislatie.just.ro) |
| **Legea 544/2001** | Accesul liber la informațiile de interes public | Fundamentul legal pentru scraping-ul portalurilor oficiale |
| **Directiva (UE) 2019/1024** | Cadrul european pentru date deschise | Conformitate cu standardele UE |

### 1.2 Precedentul "Indaco vs. Wolters Kluwer" (ICCJ, Decizia 2530/15.06.2018)

Această decizie a Înaltei Curți de Casație și Justiție stabilește distincția crucială:

> **Textul legii = Domeniu public**  
> **Structura, organizarea și prezentarea = Protejabile (Drept Sui-Generis)**

**Implicații pentru INM Mentor:**
- ✅ Putem folosi textele legislative brute
- ✅ Putem crea propriile structuri și prezentări
- ❌ NU copiem structurile altor platforme (Sintact, Lege5, Indaco)
- ❌ NU folosim note editoriale sau comentarii ale terților

---

## 2. Arhitectura "Clean Room"

Toate conținuturile generate de AI respectă protocolul **Clean Room** pentru a garanta originalitatea.

### 2.1 Principii Fundamentale

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLEAN ROOM PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Surse Oficiale]  ──▶  [Sanitizare]  ──▶  [AI Generator]      │
│   - legislatie.just.ro      │              │                   │
│   - ReJust                   ▼              ▼                   │
│   - Monitorul Oficial   Text Brut      Conținut Original       │
│                         (fără HTML,     (7 segmente            │
│                          formatare      educaționale)          │
│                          terță)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Garanții Implementate

| Garanție | Implementare | Fișier Sursă |
|----------|--------------|--------------|
| **Izolarea surselor** | Doar date de pe domenii .gov.ro | `sanitizer.ts` |
| **Îndepărtare metadata** | Strip HTML, note editoriale | `sanitizer.ts` |
| **Hash de verificare** | SHA-256 pentru fiecare text sursă | `types.ts#SanitizedLegalText` |
| **Prompt Anti-Plagiat** | AI instruuit să sintetizeze, nu să citeze doctrină | `agent-config.ts` |
| **Pattern-uri Interzise** | Regex pentru detectarea referințelor comerciale | `types.ts#FORBIDDEN_CONTENT_PATTERNS` |
| **Logging Complet** | Fiecare generare este auditabilă | `compliance-logger.ts` |

### 2.3 Pattern-uri Conținut Interzis

Următoarele pattern-uri sunt detectate și blocate automat:

```javascript
// Referințe doctrinare
/(?:conform|potrivit|după)\s+(?:doctrin(?:a|ei)|autor(?:ul|ii)|profesor)/gi

// Citări externe neoficiale
/(?:a se vedea|vezi|cf\.)\s+[A-Z][a-z]+/g

// Baze de date comerciale
/(?:Lege5|Sintact|Juridice\.ro|Indaco|Hamangiu)/gi

// Materiale universitare
/(?:curs|tratat|manual)\s+(?:de\s+)?(?:drept|juridic)/gi
```

---

## 3. Surse de Date și Legitimitate

### 3.1 Matrice de Evaluare Surse

| Sursă | URL | Legitimitate | Metodă Acces | Status |
|-------|-----|--------------|--------------|--------|
| **API MoJ** | legislatie.just.ro/FreeWebService.svc | ✅ Oficial | SOAP/WCF | ⏳ Așteptare whitelisting IP |
| **Portal MoJ** | legislatie.just.ro | ✅ Oficial | Web Scraping | ✅ Activ (fallback) |
| **ReJust** | rejust.ro | ✅ Oficial | REST API | ✅ Disponibil |
| **Monitorul Oficial** | monitoruloficial.ro | ✅ Oficial | Web | 🔄 Manual |
| **data.gov.ro** | data.gov.ro | ✅ Oficial | CSV/XML | ✅ Bootstrap |

### 3.2 Surse INTERZISE

Următoarele surse **NU SUNT** folosite sub nicio formă:

- ❌ Lege5.ro
- ❌ Sintact.ro  
- ❌ Juridice.ro
- ❌ Hamangiu.ro
- ❌ Indaco.ro
- ❌ Orice platformă comercială juridică
- ❌ Cursuri universitare digitizate
- ❌ Tratate/Manuale scanate

---

## 4. Jurnalul de Audit al Conținutului

Fiecare conținut generat este înregistrat cu următoarele metadate:

### 4.1 Structura Înregistrării de Audit

```typescript
interface ContentAuditRecord {
  // Identificare
  contentId: string;           // UUID unic
  generatedAt: Date;           // Timestamp generare
  
  // Sursă
  sourceActId: string;         // ID-ul actului legislativ sursă
  sourceActName: string;       // "Codul Civil", "Codul Penal", etc.
  sourceArticleNumber?: string;// "Art. 1166"
  sourceUrl: string;           // URL oficial
  sourceContentHash: string;   // SHA-256 al textului sursă
  
  // Generare
  modelVersion: string;        // "gemini-1.5-pro", etc.
  promptTemplate: string;      // Hash al prompt-ului folosit
  generationType: string;      // "article_breakdown", "question_explanation"
  
  // Validare
  similarityScore: number;     // 0-100, target < 10%
  forbiddenPatternsFound: string[];
  validationPassed: boolean;
}
```

### 4.2 Exemplu Log Entry

```json
{
  "contentId": "cr-2026-01-22-a1166-001",
  "generatedAt": "2026-01-22T13:30:00Z",
  "sourceActId": "ncc-287-2009",
  "sourceActName": "Codul Civil",
  "sourceArticleNumber": "Art. 1166",
  "sourceUrl": "https://legislatie.just.ro/act/287-2009",
  "sourceContentHash": "a7f3b2c1d4e5f6...",
  "modelVersion": "gemini-1.5-pro-002",
  "promptTemplate": "article_breakdown_v2",
  "generationType": "article_breakdown",
  "similarityScore": 3.2,
  "forbiddenPatternsFound": [],
  "validationPassed": true
}
```

---

## 5. Proceduri de Apărare în Caz de Litigiu

### 5.1 Dovezi Disponibile

În cazul unui litigiu privind drepturile de autor, platforma poate furniza:

1. **Jurnalul complet de audit** cu toate generările
2. **Hash-urile textelor sursă** din portaluri oficiale
3. **Timestamp-urile** de generare (anterioare oricărei acuzații)
4. **Prompt-urile AI** care demonstrează instrucțiunile de originalitate
5. **Comparația de similaritate** cu sursele oficiale

### 5.2 Argumente Juridice

| Acuzație Potențială | Apărare |
|--------------------|---------|
| "Ați copiat structura noastră" | Structura noastră (7 segmente) este diferită și originală |
| "Folosiți conținutul nostru" | Sursăm exclusiv de pe portaluri .gov.ro |
| "Textul explicativ e similar" | AI-ul sintetizează logic, nu copiază; avem similarity < 10% |
| "Ați accesat baza noastră de date" | Logs demonstrează doar accesări pe domenii oficiale |

---

## 6. Certificare și Responsabilitate

> Declar că platforma INM Mentor respectă integral prevederile Legii 8/1996 privind dreptul de autor și drepturile conexe, utilizând exclusiv surse oficiale și generând conținut original prin metoda Clean Room.

**Responsabil conformitate**: [Operator Platformă]  
**Data ultimei verificări**: 2026-01-22

---

*Acest document este actualizat periodic și face parte din documentația legală a platformei.*
