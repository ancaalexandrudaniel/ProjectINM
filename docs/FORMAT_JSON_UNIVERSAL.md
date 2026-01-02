# Format JSON Universal pentru Întrebări Grilă

Acest document descrie formatul JSON standard pentru importul întrebărilor în sistemul INM Prep.

## Concepte de Bază

### Tipuri de Seturi (Set Types)

| Set | Răspunsuri Corecte | Dificultate | Caracteristici |
|-----|-------------------|-------------|----------------|
| **A** | Exact 1 | Fundații | Variante plauzibile, nu triviale. Baza pentru înțelegerea materiei. |
| **B** | 1-3 | Avansat | Condiții suplimentare, excepții, termeni absoluți ca momeală ("niciodată", "în toate cazurile"). |
| **C** | 0-4 | Expert | Nuanțe fine: "poate vs trebuie", "nul vs anulabil", "ori de câte ori vs doar o dată". |

### Progresie în God Mode

```
Set A (fundații) → 70%+ accuracy → Unlock Set B → 70%+ accuracy → Unlock Set C
```

---

## Structura JSON Universală

Formatul "holster" universal conține toate câmpurile posibile. Seturile mai simple (A) nu populează toate câmpurile.

```json
{
  "intrebari": [
    {
      "set_type": "A" | "B" | "C",
      "tulpina": "Textul întrebării...",
      
      "variante": [
        { "litera": "a", "text": "Prima variantă", "este_corecta": true },
        { "litera": "b", "text": "A doua variantă", "este_corecta": false },
        { "litera": "c", "text": "A treia variantă", "este_corecta": false },
        { "litera": "d", "text": "A patra variantă", "este_corecta": false }
      ],
      
      "feedback": {
        "explicatie_generala": "Explicația principală...",
        "analiza_legislativa": {
          "articole": ["Art. 1203 C.civ.", "Art. 1166 C.civ."],
          "interpretare": "Interpretarea doctrinară..."
        },
        "analiza_variante": {
          "a": "De ce varianta A este corectă/greșită...",
          "b": "De ce varianta B este corectă/greșită...",
          "c": "De ce varianta C este corectă/greșită...",
          "d": "De ce varianta D este corectă/greșită..."
        },
        "comparatii": [
          {
            "referinta": "Q10",
            "clauza": "Clauza similară...",
            "concluzie": "Diferența principală..."
          }
        ],
        "retine": ["Punct cheie 1", "Punct cheie 2"],
        "schema_vizuala": "Schema ASCII sau text structurat...",
        "atentie": "Avertisment important...",
        "consecinte_practice": "Implicații în practică...",
        "exceptii": ["Excepția 1", "Excepția 2"],
        "lectie_finala": "Concluzia generală..."
      },
      
      "concepte_cheie": ["ofertă irevocabilă", "termen de acceptare"],
      "articole_relevante": ["Art. 1196 C.civ.", "Art. 1191 C.civ."],
      "capitol": "Formarea contractului",
      "materie": "civil"
    }
  ]
}
```

---

## Exemple per Set

### Set A - Fundații (1 răspuns corect)

```json
{
  "set_type": "A",
  "tulpina": "Care este termenul general de prescripție pentru acțiunile personale?",
  "variante": [
    { "litera": "a", "text": "1 an", "este_corecta": false },
    { "litera": "b", "text": "3 ani", "este_corecta": true },
    { "litera": "c", "text": "5 ani", "este_corecta": false },
    { "litera": "d", "text": "10 ani", "este_corecta": false }
  ],
  "feedback": {
    "explicatie_generala": "Conform art. 2517 din Codul Civil, termenul general de prescripție extinctivă este de 3 ani.",
    "analiza_variante": {
      "a": "FALS - 1 an se aplică doar pentru anumite acțiuni specifice",
      "b": "CORECT - Termenul general conform art. 2517 C.civ.",
      "c": "FALS - 5 ani nu este termen standard în C.civ.",
      "d": "FALS - 10 ani se aplică pentru drepturi reale"
    },
    "retine": ["Termen general = 3 ani", "Art. 2517 C.civ."]
  },
  "articole_relevante": ["Art. 2517 C.civ."]
}
```

### Set B - Avansat (1-3 răspunsuri corecte)

```json
{
  "set_type": "B",
  "tulpina": "Care dintre următoarele constituie clauze neuzuale care necesită acceptare expresă în scris?",
  "variante": [
    { "litera": "a", "text": "Clauza de modificare unilaterală a tarifelor", "este_corecta": true },
    { "litera": "b", "text": "Clauza de plată în rate", "este_corecta": false },
    { "litera": "c", "text": "Clauza de denunțare unilaterală", "este_corecta": true },
    { "litera": "d", "text": "Clauza de livrare în 30 zile", "este_corecta": false }
  ],
  "feedback": {
    "explicatie_generala": "Art. 1203 C.civ. enumeră clauzele neuzuale care necesită acceptare expresă în scris...",
    "analiza_variante": {
      "a": "CORECT - Modificarea unilaterală afectează echilibrul contractual",
      "b": "FALS - Plata în rate este o clauză uzuală, frecventă în comerț",
      "c": "CORECT - Art. 1203 pct. 2 include denunțarea unilaterală",
      "d": "FALS - Termenul de livrare este o clauză uzuală"
    },
    "retine": [
      "Clauzele neuzuale = cele care afectează unilateral poziția aderentului",
      "Semnătura pe ultima pagină ≠ acceptare expresă"
    ],
    "atentie": "Frecvența în practică NU determină caracterul uzual în sensul art. 1203!",
    "exceptii": ["Profesionistul care încheie contracte similare zilnic poate avea standard diferit"]
  },
  "articole_relevante": ["Art. 1203 C.civ."]
}
```

### Set C - Expert (0-4 răspunsuri corecte)

```json
{
  "set_type": "C",
  "tulpina": "În cazul ofertei cu termen, care dintre următoarele afirmații sunt corecte?",
  "variante": [
    { "litera": "a", "text": "Oferta poate fi revocată oricând înainte de expirarea termenului", "este_corecta": false },
    { "litera": "b", "text": "Revocarea ofertei irevocabile nu produce niciun efect", "este_corecta": true },
    { "litera": "c", "text": "Oferta devine caducă la primirea revocării", "este_corecta": false },
    { "litera": "d", "text": "Destinatarul poate accepta până la expirarea termenului indiferent de revocare", "este_corecta": true }
  ],
  "feedback": {
    "explicatie_generala": "Oferta cu termen = ofertă irevocabilă. Orice încercare de revocare este ineficientă.",
    "analiza_legislativa": {
      "articole": ["Art. 1191 C.civ.", "Art. 1196 C.civ."],
      "interpretare": "Distincție clară între retragere (înainte de ajungere) și revocare (după ajungere)"
    },
    "analiza_variante": {
      "a": "FALS - Confuzie cu oferta simplă. Oferta CU TERMEN = irevocabilă",
      "b": "CORECT - Art. 1191 alin. 2: revocarea e fără efect",
      "c": "FALS - Caducitatea intervine în alte cazuri, nu prin revocare",
      "d": "CORECT - Consecința directă a irevocabilității"
    },
    "comparatii": [
      {
        "referinta": "Oferta simplă vs. cu termen",
        "concluzie": "Oferta simplă POATE fi revocată; oferta cu termen NU"
      }
    ],
    "retine": [
      "OFERTĂ CU TERMEN = IREVOCABILĂ",
      "Revocarea = zero efecte juridice"
    ],
    "schema_vizuala": "RETRAGERE (înainte de ajungere) → posibilă\nREVOCARE (după ajungere, ofertă irevocabilă) → imposibilă",
    "atentie": "Nu confunda retragerea cu revocarea - sunt concepte diferite!"
  },
  "articole_relevante": ["Art. 1191 C.civ.", "Art. 1196 C.civ."]
}
```

---

## Prompt pentru LLM

Folosește acest prompt pentru a cere LLM-ului să genereze întrebări în format corect:

```
Generează [N] întrebări pentru Set [A/B/C] pe tema [TEMA].

REGULI SET [A/B/C]:
- Set A: Exact 1 răspuns corect. Variante plauzibile, nu triviale.
- Set B: 1-3 răspunsuri corecte. Condiții suplimentare, excepții.
- Set C: 0-4 răspunsuri corecte. Nuanțe fine ("poate vs trebuie").

Returnează JSON cu structura:
{
  "intrebari": [
    {
      "set_type": "[A/B/C]",
      "tulpina": "Textul întrebării",
      "variante": [
        { "litera": "a", "text": "...", "este_corecta": true/false },
        ...
      ],
      "feedback": {
        "explicatie_generala": "...",
        "analiza_variante": { "a": "...", "b": "...", "c": "...", "d": "..." },
        "retine": ["..."],
        "atentie": "..." (dacă există capcane)
      },
      "articole_relevante": ["Art. X C.civ."],
      "capitol": "..."
    }
  ]
}
```

---

## Validare la Import

Sistemul validează automat:
1. **Set A**: Exact 1 variantă cu `este_corecta: true`
2. **Set B**: 1-3 variante cu `este_corecta: true`
3. **Set C**: 0-4 variante cu `este_corecta: true`

Dacă întrebările nu respectă regulile setului selectat, vei primi un avertisment dar poți importa oricum.
