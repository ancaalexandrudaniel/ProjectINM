# INM Exam Platform - Design Guidelines

## Design Approach

**Selected Approach**: Design System Foundation (Material Design) with Legal Professional Customization

**Justification**: Educational platform prioritizing clarity, trust, and usability for serious legal study. Drawing from professional legal software aesthetics (Westlaw, LexisNexis) modernized for 2025.

**Core Principles**: 
- Authority through restraint
- Clarity over decoration
- Trust through traditional legal visual language
- Focus-driven layouts for serious study

## Color Palette

**Primary Colors**:
- Deep Navy: `220 45% 25%` (main brand, headers, primary actions)
- Royal Blue: `220 70% 50%` (interactive elements, links)
- Pure White: `0 0% 100%` (backgrounds, cards)
- Soft Gray: `220 15% 96%` (subtle backgrounds)

**Accent Colors**:
- Bronze/Gold: `35 80% 45%` (achievement badges, premium features) - used sparingly
- Legal Red: `0 65% 50%` (error states, urgent deadlines)
- Success Green: `145 60% 45%` (completed sections, correct answers)

**Dark Mode** (consistent implementation):
- Background: `220 25% 10%`
- Cards: `220 20% 15%`
- Text: `220 10% 95%`
- Borders: `220 15% 25%`

## Typography

**Font Families**:
- Headers: `Playfair Display` (serif, legal document aesthetic) - weights 600, 700
- Body: `Inter` (sans-serif, optimal readability) - weights 400, 500, 600
- Mono: `JetBrains Mono` (legal code references) - weight 400

**Type Scale**:
- Hero: text-5xl md:text-6xl (Playfair Display, font-bold)
- Section Headers: text-3xl md:text-4xl (Playfair Display, font-semibold)
- Card Titles: text-xl (Inter, font-semibold)
- Body: text-base (Inter, font-normal)
- Small: text-sm (Inter, font-medium)

## Layout System

**Spacing Primitives**: Use tailwind units of **4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6, p-8
- Section spacing: py-12, py-16, py-20
- Grid gaps: gap-6, gap-8
- Container max-width: max-w-7xl

**Grid Structure**:
- Dashboard: 12-column grid (sidebar + content)
- Study sections: 8-column centered content (max-w-4xl)
- Practice questions: Full-width with max-w-6xl

## Component Library

**Navigation**:
- Fixed top header: Navy background, white text, subtle shadow
- Sidebar navigation: Icons + labels, active state with royal blue highlight
- Breadcrumbs: For deep study material navigation

**Cards & Containers**:
- Elevated cards: White bg, subtle shadow (shadow-sm), rounded-lg, border border-gray-200
- Study modules: Large cards with icon header, progress bars, metadata footer
- Question cards: Clean white cards with numbered bullets, generous padding-8

**Forms & Inputs**:
- Input fields: border-2, rounded-md, focus:ring-2 focus:ring-royal-blue
- Buttons Primary: Navy bg, white text, px-6 py-3, rounded-md, shadow-sm
- Buttons Secondary: White bg, navy border-2, navy text
- Toggle switches: For practice mode settings

**Data Display**:
- Progress indicators: Linear bars with percentage, bronze accent for completion
- Statistics cards: Grid layout showing study metrics (hours, questions, accuracy)
- Calendar view: Monthly study schedule with color-coded subjects
- Leaderboards: Ranked list with badges and scores

**Legal-Specific Components**:
- Subject cards: Scale icon (Civil Law), Shield icon (Penal Law), Gavel (Procedural), FileText (Constitutional)
- Law article references: Monospace font, light gray background boxes
- Case study blocks: Bordered sections with case number headers
- Timer component: For timed practice exams

**Overlays**:
- Modal dialogs: Centered, max-w-2xl, with backdrop blur
- Toast notifications: Top-right, auto-dismiss for feedback
- Exam mode overlay: Full-screen distraction-free environment

## Images Section

**Hero Image**: 
- Large hero section featuring Romanian High Court of Justice building or classical justice imagery (columns, scales)
- Image treatment: Subtle dark overlay (40% opacity) for text legibility
- Placement: Full-width, height 60vh, with centered white text overlay
- Style: Professional photography, desaturated slightly for sophistication

**Secondary Images**:
- Study success imagery: Students in professional attire, library settings
- Placement: Feature sections, 3-column grid showcasing different study paths
- Icons: Use Lucide-react Scale, Shield, Gavel, FileText as decorative elements in section headers

**Background Patterns**:
- Subtle legal document texture (very light watermark) on white backgrounds
- Optional: Faint scales of justice pattern in footer

## Visual Hierarchy & Interactions

**Animations**: Minimal and purposeful
- Smooth transitions on hover (transform scale-105, duration-200)
- Progress bar fills (transition-all duration-500)
- Page transitions: Fade-in only (duration-300)

**Focus States**:
- Keyboard navigation: Visible focus rings (ring-2 ring-royal-blue)
- Active study section: Highlighted sidebar item with bronze left border

**Responsive Breakpoints**:
- Mobile: Stack all multi-column layouts, hamburger menu
- Tablet: 2-column grids where applicable
- Desktop: Full 3-4 column grids, persistent sidebar

**Trust Elements**:
- Official INM logo placement (top-left header)
- Success statistics prominently displayed
- Testimonials from successful candidates
- Certification badges for course completion