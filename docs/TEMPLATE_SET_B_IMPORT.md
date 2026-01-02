# Șablon Import Set B - Întrebări cu Feedback Complet

## Analiză Structură Set B

Din analiza sesiunii LLM, fiecare întrebare Set B conține următoarele secțiuni de feedback:

### 1. EXPLICAȚIE COMPLETĂ
- Text explicativ detaliat cu analiză juridică
- Poate conține subtitluri (Analiza situației, Analiza mesajului, etc.)
- Liste numerotate sau cu bullet points
- Referințe la articole din Codul Civil

### 2. ANALIZA VARIANTELOR
- Tabel cu fiecare variantă (a, b, c, d)
- Pentru fiecare: este_corecta (boolean) + explicatie detaliată
- Include ✅/❌ sau CORECT/GREȘIT

### 3. 💡 REȚINE
- Tabele comparative (ex: Ofertă vs Invitație)
- Liste cu reguli esențiale
- Definiții importante
- Scheme text (ASCII)

### 4. ⚠️ ATENȚIE (opțional)
- Capcane frecvente la INM
- Formulări indicatoare
- Greșeli de evitat

### 5. 🔍 SCHEMA (opțional)
- Diagrame ASCII
- Cronologii vizuale
- Fluxuri de proces

---

## Secțiuni de EXCLUS (specifice sesiunii LLM)

❌ NU importa:
- "Scor parțial Set B: X/X ✅"
- "CORECT! 🎯" / "Ai identificat exact variantele corecte"
- "Excelent! Continui impecabil!" / "Mergi perfect"
- Răspunsul dat de utilizator ("Răspunsul tău? b, c")
- Ora/timestamp ("3:30 PM", "12:04 AM")
- Comentarii despre progres sau performanță
- Referințe la alte întrebări din set

---

## Cerere pentru Claude/ChatGPT

```
Te rog să convertești următoarele întrebări din Set B în format JSON pentru import în aplicația INM Prep. 

STRUCTURA JSON NECESARĂ:

{
  "intrebari": [
    {
      "tulpina": "Textul complet al întrebării (speța/situația)",
      "variante": [
        {
          "litera": "a",
          "text": "Textul variantei a",
          "este_corecta": false
        },
        {
          "litera": "b", 
          "text": "Textul variantei b",
          "este_corecta": true
        },
        {
          "litera": "c",
          "text": "Textul variantei c",
          "este_corecta": true
        },
        {
          "litera": "d",
          "text": "Textul variantei d",
          "este_corecta": false
        }
      ],
      "feedback": {
        "explicatie_generala": "Textul complet din secțiunea EXPLICAȚIE COMPLETĂ, păstrând structura cu subtitluri, liste și referințe la articole",
        
        "analiza_variante": {
          "a": {
            "este_corecta": false,
            "explicatie": "Explicația detaliată pentru varianta a"
          },
          "b": {
            "este_corecta": true,
            "explicatie": "Explicația detaliată pentru varianta b"
          },
          "c": {
            "este_corecta": true,
            "explicatie": "Explicația detaliată pentru varianta c"
          },
          "d": {
            "este_corecta": false,
            "explicatie": "Explicația detaliată pentru varianta d"
          }
        },
        
        "retine": "Conținutul complet din secțiunea 💡 REȚINE - tabele, liste, reguli. Păstrează tabelele în format markdown cu | separator",
        
        "schema_aplicatie_practica": "Conținutul din secțiunea 🔍 SCHEMA sau diagrame ASCII dacă există. Păstrează formatarea exactă.",
        
        "atentie": "Conținutul din secțiunea ⚠️ ATENȚIE - capcane, avertismente, formulări indicatoare",
        
        "exceptii": null
      },
      "concepte_cheie": ["concept1", "concept2", "concept3"],
      "articole_relevante": ["art. 1188 C.civ.", "art. 1191 C.civ."],
      "materie": "civil",
      "capitol": "Formarea contractului"
    }
  ]
}

REGULI IMPORTANTE:

1. PĂSTREAZĂ INTEGRAL:
   - Tot textul din EXPLICAȚIE COMPLETĂ (cu subtitluri, liste, referințe)
   - Tabelele din REȚINE (format markdown cu |)
   - Diagramele ASCII din SCHEMA (exact cum sunt)
   - Avertismentele din ATENȚIE
   - Toate referințele la articole de lege

2. EXCLUDE COMPLET:
   - "Scor parțial Set B: X/X"
   - "CORECT! 🎯" sau orice confirmare a răspunsului
   - "Excelent!", "Continui impecabil!", "Mergi perfect"
   - Răspunsul utilizatorului și timestamp-uri
   - Comentarii despre performanță sau progres
   - Referințe la alte întrebări ("la întrebarea 3 am văzut...")

3. PENTRU TABELE (REȚINE):
   Convertește din format text compact în markdown tabel:
   
   INPUT: "CriteriuOfertăInvitațiePrețDeterminatOrientativ"
   
   OUTPUT:
   "| Criteriu | Ofertă | Invitație |
   |----------|--------|-----------|
   | Preț | Determinat | Orientativ |"

4. PENTRU ANALIZA VARIANTELOR:
   Extrage din textul compact fiecare variantă:
   
   INPUT: "a)❌Greșit. Explicație...b)✅Corect. Explicație..."
   
   OUTPUT: Obiect separat pentru fiecare literă cu este_corecta și explicatie

5. CONCEPTE CHEIE - extrage din context:
   - Termeni juridici importanți menționați
   - Instituții juridice testate
   - Distincții fundamentale (ofertă vs invitație, etc.)

6. ARTICOLE RELEVANTE - extrage din text:
   - "art. 1188", "art. 1191 alin. 2", etc.
   - Formatează consistent: "art. X C.civ." sau "art. X C.proc.civ."

7. CAPITOL - dedu din conținut:
   - Ofertă/Acceptare/Contraofertă → "Formarea contractului"  
   - Vicii de consimțământ → "Consimțământul"
   - Nulitate → "Nulitatea actului juridic"
   - etc.

---

ÎNTREBĂRILE DE CONVERTIT:

[LIPESTE AICI TEXTUL ÎNTREBĂRILOR DIN SET B]
```

---

## Exemplu JSON Complet (Întrebarea 1)

```json
{
  "intrebari": [
    {
      "tulpina": "Un producător de mobilă trimite unui potențial client următorul e-mail:\n\n„Stimate domn, vă informăm că producem mobilier la comandă. Pentru un dormitor complet (pat, dulap, noptiere), prețurile noastre pornesc de la 8.000 lei, în funcție de materialele alese. Suntem la dispoziția dumneavoastră pentru a discuta detaliile."\n\nClientul răspunde imediat: „Accept oferta de 8.000 lei pentru dormitor complet."\n\nCare dintre următoarele afirmații sunt corecte?",
      "variante": [
        {
          "litera": "a",
          "text": "Mesajul producătorului constituie o ofertă de a contracta, întrucât conține obiectul și prețul",
          "este_corecta": false
        },
        {
          "litera": "b",
          "text": "Mesajul producătorului constituie o invitație de a trata, nu o ofertă",
          "este_corecta": true
        },
        {
          "litera": "c",
          "text": "Răspunsul clientului poate fi calificat ca ofertă fermă adresată producătorului",
          "este_corecta": true
        },
        {
          "litera": "d",
          "text": "S-a încheiat un contract valabil de confecționare mobilier la prețul de 8.000 lei",
          "este_corecta": false
        }
      ],
      "feedback": {
        "explicatie_generala": "Această întrebare testează distincția fundamentală între ofertă și invitație la negocieri (invitatio ad offerendum), precum și recalificarea răspunsului la o invitație.\n\n**Analiza mesajului producătorului:**\nMesajul NU e ofertă pentru că îi lipsesc caracteristicile esențiale:\n\n- „prețurile pornesc de la 8.000 lei" → preț nedeterminat, doar un minim orientativ\n- „în funcție de materialele alese" → element esențial nespecificat\n- „pentru a discuta detaliile" → exprimă intenția de a negocia, nu de a se obliga\n\nO ofertă trebuie să fie fermă, precisă și completă. Aici avem doar o prezentare comercială care invită la discuții.\n\n**Analiza răspunsului clientului:**\nClientul spune „Accept oferta de 8.000 lei". Dar nu poți accepta ceva ce nu e ofertă. Ce face de fapt clientul?\n\n- Formulează el însuși o propunere cu termeni preciși (8.000 lei, dormitor complet)\n- Această propunere = ofertă fermă adresată producătorului\n- Rolurile s-au inversat: clientul devine ofertant, producătorul devine destinatar",
        
        "analiza_variante": {
          "a": {
            "este_corecta": false,
            "explicatie": "Greșit. „Pornesc de la" ≠ preț determinat. Lipsesc elemente esențiale (materiale). E doar invitație la negocieri."
          },
          "b": {
            "este_corecta": true,
            "explicatie": "Corect. Mesajul are caracter informativ, orientativ, și invită la discuții ulterioare. Toate indiciile arată că nu e ofertă."
          },
          "c": {
            "este_corecta": true,
            "explicatie": "Corect. „Accept 8.000 lei pentru dormitor complet" = propunere precisă cu obiect și preț determinate. E ofertă, nu acceptare."
          },
          "d": {
            "este_corecta": false,
            "explicatie": "Greșit. Fără ofertă validă nu poate exista acceptare. Fără acceptare nu există contract. Răspunsul clientului e ofertă nouă, neacceptată încă."
          }
        },
        
        "retine": "**OFERTĂ vs. INVITAȚIE LA NEGOCIERI:**\n\n| Criteriu | Ofertă | Invitație |\n|----------|--------|----------|\n| Preț | Determinat sau determinabil precis | Orientativ, „de la", „negociabil" |\n| Elemente esențiale | Complete | Incomplete sau vagi |\n| Intenție | De a se obliga la acceptare | De a discuta, negocia |\n| Efect la „acceptare" | Contract încheiat | „Acceptarea" devine ea însăși ofertă |\n\n**RECALIFICAREA ACTULUI:**\n- „Accept" adresat unei invitații ≠ acceptare\n- = ofertă nouă care așteaptă acceptarea celuilalt\n- Judecătorul califică actul după conținut, nu după denumirea dată de părți",
        
        "schema_aplicatie_practica": null,
        
        "atentie": "La INM, formulări precum:\n\n- „prețuri de la..."\n- „aproximativ..."\n- „în funcție de..."\n- „pentru a discuta..."\n\n= indicatori clari că NU e ofertă, ci invitație.",
        
        "exceptii": null
      },
      "concepte_cheie": ["ofertă", "invitație la negocieri", "invitatio ad offerendum", "recalificare", "intenție de a se obliga"],
      "articole_relevante": ["art. 1188 C.civ.", "art. 1189 C.civ."],
      "materie": "civil",
      "capitol": "Formarea contractului"
    }
  ]
}
```

---

## Exemplu cu SCHEMA (Întrebarea 2)

```json
{
  "tulpina": "Andrei îi trimite Biancăi o scrisoare: „Îți vând mașina mea pentru 15.000 euro. Oferta e valabilă 10 zile." A doua zi, Andrei vinde mașina lui Călin, care plătește și primește mașina imediat. În ziua a 5-a, Bianca trimite o scrisoare de acceptare care ajunge la Andrei în ziua a 7-a.\n\nCare dintre următoarele afirmații sunt corecte?",
  
  "feedback": {
    "schema_aplicatie_practica": "**SCHEMA CRONOLOGICĂ:**\n\n```\nZIUA 1     ZIUA 2          ZIUA 5           ZIUA 7         ZIUA 10\n   │          │               │                │               │\n   ▼          ▼               ▼                ▼               ▼\nOfertă    Vânzare         Bianca           Acceptarea      Termen\ncătre     către           trimite          ajunge la       expiră\nBianca    Călin           acceptarea       Andrei\n(10 zile) (executat)                       \n   │          │               │                │\n   │          │               │                ▼\n   │          │               │          CONTRACT 2\n   │          │               │          (Andrei-Bianca)\n   │          ▼               │          = încheiat dar\n   │     CONTRACT 1           │            inexecutabil\n   │     (Andrei-Călin)       │\n   │     = valabil +          │\n   │       executat           │\n   │                          │\n   └──────────────────────────┴─────────────────────────────────\n                              \n   REZULTAT: Andrei datorează daune-interese Biancăi\n```",
    
    "retine": "**OFERTA IREVOCABILĂ — efecte:**\n\n| Situație | Efect |\n|----------|-------|\n| Ofertantul „revocă" în termen | Revocarea NU produce efecte asupra formării contractului |\n| Destinatarul acceptă în termen | Contract încheiat, chiar dacă ofertantul s-a „răzgândit" |\n| Ofertantul înstrăinează bunul | Contractul cu terțul e VALABIL, dar ofertantul răspunde față de destinatarul ofertei |\n\n**VÂNZAREA BUNULUI ALTUIA:**\n- Contractul nu e nul\n- E valabil, dar generează obligația de daune-interese pentru neexecutare\n- Terțul de bună-credință e protejat\n\n**CADUCITATEA OFERTEI — cauze limitative (art. 1195):**\n- Acceptarea nu ajunge în termen\n- Destinatarul refuză oferta\n- Decesul/incapacitatea ofertantului sau destinatarului (cu nuanțe pentru oferta irevocabilă)\n\n**NU sunt cauze de caducitate:**\n- Revocarea ofertei irevocabile\n- Înstrăinarea bunului către terți\n- Simpla schimbare de intenție a ofertantului"
  }
}
```

---

## Verificare Finală

După import, verifică în aplicație:
1. ✅ Tabelele din REȚINE se afișează corect cu coloane
2. ✅ Diagramele ASCII din SCHEMA păstrează formatarea
3. ✅ Analiza per variantă apare color-coded (verde/roșu)
4. ✅ Secțiunea ATENȚIE are styling portocaliu
5. ✅ Conceptele cheie apar ca badge-uri
6. ✅ Articolele relevante sunt linkabile
