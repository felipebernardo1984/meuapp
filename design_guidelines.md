# Arena MUV - Design Guidelines

## Design Approach
**System Selected:** Material Design 3 + Fitness App Patterns  
**Justification:** This is a utility-focused productivity tool requiring clear data hierarchy, efficient workflows, and mobile-first responsive design. Drawing inspiration from fitness tracking apps (Strava, Nike Training Club) while maintaining Material Design principles for consistency and usability.

**Key Design Principles:**
- Mobile-first dashboard design optimized for quick check-ins
- Clear visual hierarchy for different user roles
- Progress visualization that motivates continued engagement
- Professional yet energetic aesthetic suitable for sports context

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 220 85% 45% (Vibrant blue - trust, professionalism)
- Primary Variant: 220 75% 35% (Darker blue for depth)
- Secondary: 160 70% 45% (Teal/green - success, growth, completion)
- Background: 0 0% 98% (Near white)
- Surface: 0 0% 100% (Pure white for cards)
- Error: 0 75% 55% (Alert red for pending status)
- Success: 140 65% 45% (Green for completed check-ins)
- Warning: 35 85% 55% (Orange for approaching deadlines)

**Dark Mode:**
- Primary: 220 85% 65% (Lighter blue for dark backgrounds)
- Primary Variant: 220 75% 75%
- Secondary: 160 60% 55%
- Background: 220 15% 8% (Deep navy-tinted dark)
- Surface: 220 12% 12% (Cards slightly lighter than background)
- Error: 0 70% 60%
- Success: 140 55% 50%
- Warning: 35 80% 60%

**Text Colors (Light/Dark):**
- Primary text: 0 0% 13% / 0 0% 95%
- Secondary text: 0 0% 45% / 0 0% 65%
- Disabled text: 0 0% 65% / 0 0% 45%

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - All UI text, clean and highly legible
- Accent: 'Poppins' (Google Fonts) - Headings and CTAs, slightly rounded for friendly feel

**Font Sizes & Weights:**
- H1: text-4xl font-bold (Dashboard titles)
- H2: text-2xl font-semibold (Section headers)
- H3: text-xl font-medium (Card titles, student names)
- Body: text-base font-normal (Main content)
- Small: text-sm font-normal (Timestamps, secondary info)
- Caption: text-xs font-medium (Labels, status badges)

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16 consistently
- Component padding: p-4 to p-8
- Section margins: mb-6 to mb-12
- Card gaps: gap-4 to gap-6
- Button padding: px-6 py-3

**Grid System:**
- Mobile: Single column (grid-cols-1)
- Tablet: 2 columns where appropriate (md:grid-cols-2)
- Desktop: 3-4 columns for dashboards (lg:grid-cols-3, xl:grid-cols-4)

**Container Widths:**
- Max content width: max-w-7xl
- Card max width: max-w-md for focused interactions
- Full-width dashboards with contained inner content

### D. Component Library

**Navigation:**
- Top app bar with profile avatar, notifications, role indicator
- Bottom navigation for mobile (Home, History, Profile)
- Side drawer for manager/teacher with modalidade filters

**Cards & Data Display:**
- Elevated cards with subtle shadow (shadow-md)
- Check-in progress cards with circular or linear progress bars
- Student list items with avatar, name, last check-in timestamp
- Status badges with rounded-full design (bg-success/error/warning)

**Forms & Inputs:**
- Outlined text fields with floating labels (Material Design pattern)
- Large, touch-friendly buttons (min-h-12)
- Toggle switches for plan selection (8 vs 12 check-ins)
- Photo upload area with preview and edit capability
- Checkbox for commitment acceptance

**Progress Visualization:**
- Circular progress rings for individual student progress (8/8 or 12/12)
- Linear progress bars showing cycle completion (days remaining in 30-day cycle)
- Color-coded: 0-50% (warning), 50-80% (primary), 80-100% (success)

**Buttons:**
- Primary: Filled with primary color (Check-in button)
- Secondary: Outlined variant (Cancel, Back)
- Large FAB for main check-in action on student view
- Icon buttons for quick actions (edit, delete, refresh)

**Tables & Lists:**
- Striped rows for better readability in reports
- Sortable columns for manager reports
- Sticky headers on scroll
- Quick action buttons per row (edit check-in, view details)

**Overlays:**
- Modal dialogs for confirmations (approve student, complete cycle)
- Bottom sheets for mobile actions
- Snackbar notifications for success/error feedback
- Loading states with skeleton screens

**Data Visualization:**
- Simple bar charts for manager reports (check-ins per modalidade)
- Calendar view showing check-in history with markers
- Statistics cards (total students, active cycles, pending approvals)

### E. Animations

**Minimal, Purposeful Only:**
- Check-in button: Scale press effect (scale-95 on active)
- Progress bars: Smooth fill animation on data update (transition-all duration-500)
- Card hover: Subtle lift (hover:shadow-lg transition)
- Page transitions: Simple fade (no elaborate animations)
- Success states: Brief checkmark animation on successful check-in

---

## Role-Specific UI Considerations

**Student View:**
- Large, prominent check-in button (CTAs)
- Clear progress visualization front and center
- Simple, focused interface with minimal navigation
- Photo avatar displayed prominently

**Teacher View:**
- Scannable list of students with quick status overview
- Filter/sort by modalidade, last check-in, plan type
- Notification badge on new check-ins
- Quick action buttons for manual check-in entry

**Manager View:**
- Dense information layout with multiple data points
- Advanced filtering (date range, modalidade, teacher, status)
- Export buttons prominently placed
- Approval queue section for new students
- Multi-column dashboard layout on desktop

---

## Responsive Behavior

**Mobile (< 768px):**
- Bottom navigation bar
- Single column layouts
- Full-width cards
- Large touch targets (min 44px)

**Tablet (768px - 1024px):**
- 2-column grids where appropriate
- Side navigation available as drawer
- Optimized card sizes

**Desktop (> 1024px):**
- 3-4 column dashboard layouts
- Persistent side navigation for manager
- Wider data tables with more columns visible

---

## Images

**Profile Photos:**
- Student avatar: Circular, 80px on profile, 40px in lists
- Teacher/Manager avatars: 48px in app bar
- Placeholder avatars with initials on colored backgrounds

**Modalidade Icons:**
- Beach Tennis: Custom sport icon
- Beach Volleyball: Custom sport icon  
- Footvolley: Custom sport icon
- Use consistent icon style (outlined, 24px base size)

**Empty States:**
- Illustration for "no check-ins yet" state
- Friendly graphic for "waiting for approval" screen
- Simple icons for empty reports/lists