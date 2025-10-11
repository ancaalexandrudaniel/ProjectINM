# Overview

This is an INM (Institutul Național al Magistraturii) exam preparation platform - a quiz application designed to help Romanian law students prepare for the National Institute of Magistracy entrance exam. The application provides practice quizzes, simulations, performance tracking, and weak point analysis across four legal subjects: Civil Law, Civil Procedural Law, Penal Law, and Penal Procedural Law.

The platform features a modern, responsive interface built with React and TypeScript, backed by an Express server with PostgreSQL database integration. It includes comprehensive quiz functionality with timed sessions, detailed explanations with legal references, progress tracking, personalized weak point identification, **and AI-powered features using Google Gemini 2.0 Flash Experimental model**.

## Recent AI Features Added (Oct 2025)

1. **AI Wrong Answer Explanations** - Gemini analyzes why users answered incorrectly and provides personalized Romanian explanations with practical legal examples. Accessible via "Explică cu AI" button on wrong-answers page.

2. **PDF Document Upload System** - Users can upload legal PDFs (tematic\u0103, bibliografie, subiecte anterioare, coduri, cursuri) to `/documents` page. Files are stored in Replit Object Storage, text extracted via pdf-parse, and analyzed by Gemini AI for summaries.

3. **AI Infrastructure** - Complete Gemini integration in `server/gemini.ts` with 5 functions: explainWrongAnswer, analyzePreviousExams, generateStudyPlan, analyzeLegalDocument, chatWithLegalAssistant. Uses correct SDK pattern: `ai.models.generateContent()` with structured contents array.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router
- TanStack Query (React Query) for server state management and caching

**UI Component Strategy**
- Radix UI primitives for accessible, unstyled base components
- shadcn/ui component library built on top of Radix with Tailwind styling
- Custom theming system using CSS variables for consistent design
- Responsive design with mobile-first breakpoint handling

**State Management Approach**
- Server state managed via TanStack Query with custom query functions
- Local component state using React hooks
- No global state management library (Redux/Zustand) - relies on React Query cache
- Form state handled through React Hook Form with Zod validation

## Backend Architecture

**Server Framework**
- Express.js for REST API endpoints
- TypeScript with ES modules for type safety and modern JavaScript
- Custom Vite integration for serving frontend in development
- Middleware for JSON parsing, request logging, and error handling

**API Design Pattern**
- RESTful endpoints organized by resource type (questions, sessions, answers, progress)
- Centralized route registration in `server/routes.ts`
- Request validation using Zod schemas shared between client and server
- Response logging middleware for debugging and monitoring

**Data Layer**
- Storage abstraction interface (`IStorage`) for flexible data persistence
- In-memory implementation (`MemStorage`) for development/testing
- Designed to support database migration (Drizzle ORM schemas prepared for PostgreSQL)
- Shared schema definitions in `shared/schema.ts` using Drizzle and Zod

## External Dependencies

**Database & ORM**
- PostgreSQL as the target production database
- Drizzle ORM for type-safe database queries and migrations
- Neon serverless Postgres adapter (`@neondatabase/serverless`) for serverless deployments
- Session storage using `connect-pg-simple` for PostgreSQL-backed sessions

**UI Component Libraries**
- Radix UI components for accessible primitives (dialogs, dropdowns, tooltips, etc.)
- Recharts for data visualization and progress charts
- Embla Carousel for carousel functionality
- Lucide React for consistent icon system

**Development Tools**
- Replit-specific plugins for development banner, error overlay, and source mapping
- ESBuild for production server bundling
- TSX for TypeScript execution in development
- Drizzle Kit for database migrations and schema management

**Schema Validation**
- Zod for runtime type validation
- `drizzle-zod` for generating Zod schemas from Drizzle tables
- `@hookform/resolvers` for React Hook Form + Zod integration

**Styling System**
- Tailwind CSS for utility-first styling
- PostCSS with Autoprefixer for CSS processing
- `class-variance-authority` for managing component variants
- `tailwind-merge` and `clsx` for conditional class composition

**Key Architectural Decisions**
- Monorepo structure with shared types between client and server
- Path aliases for clean imports (@/, @shared/, @assets/)
- Separation of concerns: UI components, business logic, and data fetching
- Production build outputs separate bundles for client (dist/public) and server (dist/)
- Development mode uses Vite dev server with Express for API routes