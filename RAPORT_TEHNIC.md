# RAPORT TEHNIC - ProjectINM (INMAiMentor)

Acest raport detaliază stadiul tehnic al proiectului pentru analiză (Code Review / AI Analysis).

## 1. Structura de Fișiere
Lista principalelor fișiere și directoare din proiect:

```text
/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/          # Pagini (Syllabus, Home, etc.)
│   │   ├── components/     # Componente UI (Shadcn UI)
│   │   ├── lib/            # Utilitare (api.ts, queryClient)
│   │   └── App.tsx         # Router principal
│   └── index.html
├── server/                 # Backend (Node.js + Express)
│   ├── index.ts            # Entry point (Server setup)
│   ├── routes.ts           # Definiția rutelor API
│   ├── db.ts               # Configurare Bază de Date (Neon)
│   └── seed.ts             # Script populare date (Grile)
├── shared/
│   └── schema.ts           # Schema Bazei de Date (Drizzle ORM)
├── syllabus.json           # Date structurate (Tematica parrsată)
├── package.json            # Dependințe
└── vite.config.ts          # Configurare Build
```

## 2. Tehnologii Folosite

**Frontend:**
*   **Framework:** React 18 (cu TypeScript)
*   **Build Tool:** Vite
*   **Styling:** TailwindCSS + Shadcn/UI (Radix Primitives)
*   **State/Data Fetching:** TanStack Query (React Query)
*   **Routing:** wouter (lightweight router)

**Backend:**
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **ORM:** Drizzle ORM
*   **Database:** PostgreSQL (Cloud - Neon Tech)
*   **AI Integration:** Google Gemini API (pentru analiză documente/feedback)

**Deployment:**
*   **Hosting:** Railway (Web Service)
*   **DNS:** Replit (pentru domeniu) / Railway (pentru servire)

## 3. Schema Bazei de Date
Schema este definită în `shared/schema.ts` folosind Drizzle ORM. Principalele tabele sunt:

*   `users`: Utilizatori (id, username, email, full_name).
*   `questions`: Grilele de examen (enunț, variante, răspuns corect, explicații).
*   `questionTopics`: Tematica ierarhică (Materie -> Topic).
*   `quizSessions`: Sesiuni de testare (istoric teste).
*   `uploadedDocuments`: PDF-uri încărcate de utilizator.

## 4. Codul Principal (Entry Point)
Fișier: `server/index.ts`
Acesta este punctul de intrare care configurează serverul Express și servește fișierele statice în producție.

```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: "50mb" })); // Limită crescută pentru upload PDF
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Middleware logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup environment (Dev vs Prod)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
```

## 5. Exemplu de Date (Grile)
Așa arată structura unei întrebări (grile) în baza de date (extras din `server/seed.ts`).
Este un obiect JSON complex care stochează textul, variantele, răspunsul corect și explicațiile juridice.

```json
{
  "subject": "civil",
  "chapter": "Persoanele fizice și juridice",
  "difficulty": "medium",
  "questionText": "Care dintre următoarele reprezintă o persoană juridică de drept privat?",
  "options": [
    { "text": "Ministerul Justiției", "correct": false },
    { "text": "Societatea comercială pe acțiuni", "correct": true },
    { "text": "Primăria municipiului București", "correct": false },
    { "text": "Curtea de Apel", "correct": false }
  ],
  "correctAnswer": 1,
  "explanation": "Societatea comercială pe acțiuni este o persoană juridică de drept privat...",
  "legalReferences": ["Codul Civil, art. 187-188", "Legea nr. 31/1990"]
}
```
