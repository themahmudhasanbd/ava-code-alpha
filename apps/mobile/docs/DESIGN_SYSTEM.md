# AvA Code Alpha — Shadcn Mobile Design System Specification

## 1. Aesthetic Philosophy

The UI is inspired by **shadcn/ui** design principles tailored for mobile:
- **Clean Minimalist Surfaces**: Deep Zinc backgrounds (`#09090B`, `#18181B`) with ultra-fine `1px` structural borders (`rgba(255,255,255,0.08)`).
- **High-Agency Typography**: Geist / Inter for crisp UI text and JetBrains Mono for code snippets, diffs, and JSON streams.
- **Micro-Spring Motion**: All tactile controls (buttons, cards, badges) feature subtle scale feedback (`0.97` on tap) with 150ms spring physics.
- **Zero Visual Noise**: No rainbow gradients or heavy drop shadows. High contrast white foreground text with muted steel secondary metadata.

---

## 2. Color Palette (Zinc Tokens)

| Token | Hex Value | Purpose |
|---|---|---|
| `background` | `#09090B` (Zinc-950) | Main app surface & screen background |
| `surface` | `#121215` (Zinc-900) | Card fill, bottom sheets, navigation dock |
| `surfaceElevated` | `#18181B` (Zinc-850) | Tool cards, dialogs, dropdown menus |
| `border` | `rgba(255,255,255,0.08)` | 1px border dividers & card outlines |
| `borderFocus` | `#FFFFFF` | Active input ring focus outline |
| `textPrimary` | `#FAFAFA` (Zinc-50) | Primary headlines, user prompts, key text |
| `textSecondary` | `#A1A1AA` (Zinc-400) | Subtitles, timestamps, metadata |
| `textMuted` | `#71717A` (Zinc-500) | Inactive labels, placeholder text |
| `accentPrimary` | `#3B82F6` (Blue-500) | Primary actions & Antigravity provider tag |
| `accentSuccess` | `#10B981` (Emerald-500)| Completed turn indicator, diff added line |
| `accentDanger` | `#EF4444` (Red-500) | Interrupt button, diff removed line, errors |
| `accentWarning` | `#F59E0B` (Amber-500) | Tool approval prompt, pending state |

---

## 3. Reusable UI Components

### 1. `ShadcnButton`
- **Variants**: `primary` (Solid white with black text), `secondary` (Zinc-800 with white text), `outline` (Transparent with 1px border), `ghost` (No border), `destructive` (Red fill).
- **Interaction**: Scales to `0.97` on touch with subtle haptic tap feedback. Includes built-in smooth loading spinner.

### 2. `ShadcnCard`
- **Structure**: Rounded `16px` corners, `1px` crisp border, optional subtle blur backdrop for floating tool sheets.

### 3. `ShadcnInput`
- **Structure**: Rounded `10px`, dark fill `#121215`, animated border transition when focused, clear icon button, password reveal toggle.

### 4. `ShadcnBadge`
- **Variants**: `provider` (Google Antigravity, OpenRouter), `status` (Streaming, Completed, Failed), `model` (`gemini-3.7-flash-tiered`).

### 5. `DiffViewer`
- **Structure**: Compact line-by-line code difference inspector with green additions (`+`), red deletions (`-`), and monospace styling.

### 6. `ThinkingAccordion`
- **Structure**: Collapsible accordion that streams reasoning thoughts with animated pulse indicator.
