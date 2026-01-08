# AGENTS.md – SvelteKit Personal Website

## Stack

- **Runtime:** Node.js 24 LTS
- **Package Manager:** npm
- **Framework:** SvelteKit + Svelte 5 + TypeScript
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel

## Commands

- Install: `npm install`
- Develop: `npm run dev` (never run build during agent sessions)
- Build: `npm run build`
- Preview: `npm run preview`
- Format: `npm run format`
- Typecheck: `npm run check`

## Coding Conventions

### TypeScript
- Never use `any` – find correct types
- Never use type assertions (`as unknown`, `as Type`) – figure out correct types instead
- Specify array types: `const items: string[] = []`
- Object arguments for functions with 2+ parameters
- Prefer `.map()`, `.filter()` over loops
- Do NOT write explicit return types for functions (unless there is a VERY good reason)

### Svelte 5
- Always use `<script lang="ts">` in components
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- Never import runes – they are compiler keywords
- Use `onclick={handler}` not `on:click={handler}` (Svelte 5 syntax)
- Use `{@render children()}` in layouts, not `<slot />`
- Treat props as read-only; use `$bindable` for two-way binding
- Avoid destructuring reactive proxies (breaks reactivity)

### File Structure
- Kebab-case filenames
- Components: `src/lib/components/`
- Utilities: `src/lib/`
- Routes: `src/routes/`

### Styling (Tailwind CSS v4)
- CSS-first config: use `@theme` in CSS, no tailwind.config.js
- Import with `@import "tailwindcss"` (not `@tailwind` directives)
- Use `@tailwindcss/vite` plugin (no postcss-import or autoprefixer needed)
- Spacing multiples of 4 (p-4, gap-4)
- Use `flex` + `gap` over margins
- Prefer `size-4` over `w-4 h-4`
- Use opacity syntax: `bg-black/50` (not `bg-opacity-*`)
- CSS variables in arbitrary values: `bg-(--brand-color)` not `bg-[--brand-color]`

### Git
- Never commit unless explicitly asked
- All checks must pass before commits
