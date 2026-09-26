# AvA Code interface

## Build
- Replace the empty page with a mobile-first coding-agent workspace inspired by Lovable, Codex, and Claude.
- Create a clean top header with the AvA Code identity, drawer control, current workspace label, and compact action controls.
- Create a slide-out drawer with two tabs: **Menu** and **Sessions**.
- In **Menu**, show primary navigation and workspace actions.
- In **Sessions**, group sample sessions under project headings, with clear active, hover, and empty states.
- Create a centered welcome area and a polished bottom prompt composer with attachment, mode/model controls, microphone, and send actions.
- Use the supplied AvA artwork as the product identity.

## Interaction
- Drawer opens and closes smoothly on mobile and remains usable at desktop sizes.
- Drawer tabs switch content without navigation or persistence.
- Project groups can expand and collapse; selecting a sample session updates the visible active state.
- Prompt text and controls are interactive UI only; sending will not call a model or save messages.

## Visual direction
- Minimal light workspace with soft neutral surfaces, crisp borders, restrained blue-violet brand accents, and high-contrast typography.
- Compact controls, subtle shadows, small corner radii, and short motion transitions.
- Responsive layout optimized for the current mobile viewport while remaining balanced on desktop.

## Technical details
- Use the existing TanStack app structure and semantic Tailwind design tokens.
- Install and compose the official AI Elements prompt-input primitives instead of creating a custom composer foundation.
- Add page-specific title, description, Open Graph, and Twitter metadata.
- Verify the interface at mobile and desktop sizes and check the preview for errors.

## Out of scope
- No backend, authentication, model calls, database, or browser history storage.
