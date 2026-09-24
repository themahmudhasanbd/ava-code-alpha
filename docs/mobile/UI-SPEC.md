# AvA Mobile V2 — UI Design Specification

## Design Principles

1. **Minimal** — No decorative elements that don't serve a purpose
2. **Professional** — Premium feel matching Claude/Codex quality level
3. **Fast** — Instant touch response, smooth animations at 60fps
4. **Mobile-first** — Designed for thumb reach, one-handed use
5. **Excellent typography** — Clear hierarchy, readable at all sizes
6. **Subtle animation** — Functional transitions, no gratuitous motion
7. **Clean spacing** — Consistent 8px grid, generous whitespace
8. **Dark mode native** — Dark mode is the primary theme

## Screen Map

```
App
├── Onboarding (first launch)
│   └── Server URL input → Connect → Done
├── Main Shell (bottom nav)
│   ├── Home
│   │   ├── Quick actions (New Session, Recent Sessions)
│   │   └── Connection status banner
│   ├── Chat (primary)
│   │   ├── Message list (scrollable)
│   │   │   ├── User message bubble
│   │   │   └── Agent turn
│   │   │       ├── Agent header (avatar, model, time)
│   │   │       ├── Reasoning panel (collapsible)
│   │   │       ├── Text content (markdown)
│   │   │       ├── Tool cards (collapsible)
│   │   │       ├── Error card
│   │   │       └── Question/permission dock
│   │   └── Composer (sticky bottom)
│   │       ├── Text input
│   │       ├── Send/Stop button
│   │       └── Model badge
│   ├── Sessions
│   │   ├── Session list (grouped by project)
│   │   ├── Search bar
│   │   └── Session card (title, status, time)
│   └── Settings
│       ├── Server connection
│       ├── Default model
│       ├── Appearance (dark/light)
│       └── About
└── Session Detail (push)
    └── Full chat view for selected session
```

## Color System

### Dark Mode (Primary)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0A0A0A` | Main background |
| `bg-secondary` | `#141414` | Cards, panels |
| `bg-tertiary` | `#1E1E1E` | Elevated surfaces |
| `border` | `#262626` | Subtle borders |
| `text-primary` | `#FAFAFA` | Primary text |
| `text-secondary` | `#A1A1A1` | Secondary text |
| `text-tertiary` | `#737373` | Muted text |
| `accent` | `#3B82F6` | Interactive elements |
| `success` | `#22C55E` | Completed states |
| `error` | `#EF4444` | Error states |
| `warning` | `#F59E0B` | Warning states |

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#FFFFFF` | Main background |
| `bg-secondary` | `#F5F5F5` | Cards, panels |
| `bg-tertiary` | `#E5E5E5` | Elevated surfaces |
| `border` | `#E5E5E5` | Subtle borders |
| `text-primary` | `#0A0A0A` | Primary text |
| `text-secondary` | `#525252` | Secondary text |
| `text-tertiary` | `#A1A1A1` | Muted text |

## Typography

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 24px | 600 | Screen titles |
| H2 | 20px | 600 | Section headers |
| H3 | 16px | 600 | Card titles |
| Body | 15px | 400 | Message text, descriptions |
| Caption | 13px | 400 | Timestamps, metadata |
| Mono | 13px | 400 | Code blocks, commands |

**Font stack**: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
**Mono font**: `JetBrains Mono, Fira Code, monospace`

## Component Specifications

### Chat Composer

- **Height**: Auto-expanding, min 48px, max 200px
- **Border**: 1px solid `border` color, rounded-xl (12px)
- **Send button**: 40px circle, accent color when text present, disabled gray when empty
- **Stop button**: 40px circle, red, appears during active turn
- **Position**: Sticky bottom with safe area padding

### Message Bubble (User)

- **Background**: `bg-tertiary`
- **Border radius**: 16px (rounded-2xl)
- **Max width**: 85% of screen
- **Alignment**: Right
- **Padding**: 12px 16px

### Agent Turn

- **Header**: Avatar (32px) + model name + timestamp
- **Background**: Transparent (no bubble)
- **Max width**: 100%
- **Alignment**: Left
- **Reasoning**: Collapsible panel with thinking icon, auto-collapses on completion
- **Tool cards**: Collapsible cards with status pill (Running/Done/Failed)

### Tool Card

- **Background**: `bg-secondary`
- **Border**: 1px solid `border`
- **Border radius**: 12px
- **Header**: Tool icon + tool name + status pill
- **Body**: Expandable output (collapsed by default for completed, expanded for running)
- **Status colors**: Running = accent, Completed = success, Failed = error

### Session Card

- **Background**: `bg-secondary`
- **Border radius**: 12px
- **Padding**: 16px
- **Content**: Title (H3) + preview text (caption) + timestamp (caption)
- **Active indicator**: Left accent border

### Status Indicators

- **Connected**: Green dot + "Connected"
- **Connecting**: Amber pulsing dot + "Connecting..."
- **Disconnected**: Red dot + "Disconnected" + Retry button
- **Streaming**: Pulsing green dot + elapsed timer

## Navigation

- **Bottom tab bar**: 4 tabs (Home, Chat, Sessions, Settings)
- **Tab bar height**: 56px + safe area
- **Active tab**: Accent color icon + label
- **Inactive tab**: `text-tertiary` icon + label
- **Android back**: Standard back navigation, exit confirmation on root

## Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Page transition | 300ms | ease-out | Screen push/pop |
| Tab switch | 200ms | ease-in-out | Bottom nav |
| Typing indicator | 1500ms loop | ease-in-out | Agent thinking |
| Status pulse | 1000ms loop | ease-in-out | Running indicator |
| Card expand | 200ms | ease-out | Tool/reasoning expand |
| Message appear | 150ms | ease-out | New message in list |
| Button press | 100ms | ease-in | Touch feedback |

## Touch Targets

- **Minimum**: 48px x 48px for all interactive elements
- **Spacing**: Minimum 8px between adjacent touch targets
- **Scroll**: Momentum scrolling with rubber-band effect
- **Pull-to-refresh**: On session list (not on chat)
