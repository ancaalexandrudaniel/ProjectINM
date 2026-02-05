<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<artifacts>
--- IMPLEMENTATION PLAN ---
# Migrare Bază de Date: Neon → Railway PostgreSQL

## Obiectiv
Mutarea bazei de date de pe Neon (gratuit) pe Railway PostgreSQL pentru a profita de creditul Pro de $20/lună și a simplifica infrastructura.

## Beneficii
- ✅ Totul într-un singur loc (Railway)
- ✅ Fără costuri extra (încape în creditul Pro)
- ✅ Baza de date mereu activă (nu mai "adoarme")
- ✅ Un singur dashboard de administrat

---

## Pași pentru Migrare

### Partea 1: Pregătire Railway (în browser)

> [!IMPORTANT]
> Acești pași îi faci TU în dashboard-ul Railway

#### 1.1 Adaugă PostgreSQL în Railway
1. Mergi la [railway.app](https://railway.app) → Proiectul INM Mentor
2. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
3. Așteaptă 30 secunde să se creeze

#### 1.2 Obține noile credențiale
1. Click pe serviciul PostgreSQL nou creat
2. Tab **"Variables"** sau **"Connect"**
3. Copiază valoarea **`DATABASE_URL`** (arată ca: `postgresql://postgres:xxxxx@xxx.railway.app:5432/railway`)

---

### Partea 2: Export date din Neon

> [!IMPORTANT]  
> Ai nevoie de Neon DATABASE_URL actual pentru export

#### 2.1 Export cu pg_dump
Rulezi în terminal (cu DATABASE_URL de la Neon):
```bash
pg_dump "postgresql://...neon.tech/neondb?sslmode=require" > backup.sql
```

---

### Partea 3: Import date în Railway

#### 3.1 Import backup
```bash
psql "postgresql://...railway.app:5432/railway" < backup.sql
```

---

### Partea 4: Modificări cod (le fac eu)

#### [MODIFY] [db.ts](file:///c:/INM/Replit%20apps/INMAiMentor/server/db.ts)
- Schimbăm de la clientul Neon (`@neondatabase/serverless`) la clientul standard PostgreSQL (`pg`)
- Motivul: Railway folosește PostgreSQL standard, nu serverless

#### [MODIFY] [package.json](file:///c:/INM/Replit%20apps/INMAiMentor/package.json)  
- Adăugăm dependența `pg` (driver PostgreSQL standard)
- Păstrăm `@neondatabase/serverless` pentru compatibilitate (opțional de șters)

---

### Partea 5: Update Railway Variables

> [!IMPORTANT]
> În dashboard Railway, schimbă `DATABASE_URL` să pointeze la noul PostgreSQL

---

### Partea 6: Deploy și Verificare

1. Railway va face auto-deploy la push
2. Verificăm că aplicația pornește
3. Testăm funcționalitățile principale

---

## Verificare Finală

- [ ] PostgreSQL rulează pe Railway
- [ ] Datele sunt importate
- [ ] Aplicația se conectează corect
- [ ] Toate funcționalitățile merg
- [ ] (Opțional) Ștergem contul Neon

---

## Întrebări pentru tine

1. **Ai pg_dump instalat local?** (vine cu PostgreSQL)
   - Dacă nu, pot să îți arăt cum să exportezi direct din Neon dashboard

2. **Ai acces la Neon DATABASE_URL?** (din .env sau dashboardul Neon)

3. **Vrei să procedăm acum sau să așteptăm?**
</artifacts>
</workspace_context>
<mission_brief>[Describe your task here...]</mission_brief>