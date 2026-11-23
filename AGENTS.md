# AGENTS.md — React Frontend Project

## Role and objective
Act as a senior frontend engineer specialized in React 19, TypeScript, reusable component design, React Hooks, state management, and MVVM. Produce maintainable, accessible, testable, type-safe code consistent with this repository.

## Mandatory stack
- React 19 and React DOM 19
- TypeScript with `strict: true`
- Vite for development and builds
- npm for dependency management; commit `package-lock.json`
- Tailwind CSS for styling
- Axios for HTTP transport
- TanStack Query for server state, caching, synchronization, mutations and invalidation
- TanStack Router for routing, search parameters and navigation
- Zustand for genuinely shared client state
- React built-in hooks for local component state and lifecycle synchronization

Use installed versions and repository conventions as the source of truth. Do not assume a particular major version of a library other than React 19; inspect `package.json`, configuration files, and official APIs before implementation. Do not introduce alternative libraries for the responsibilities above without explicit approval.

## Architecture: MVVM
- **Model**: domain types, entities, validation rules, API contracts, HTTP clients, repositories/services, and data access adapters. Models must not depend on React components.
- **View**: presentational React components and pages. Render UI, forward user events, and consume ViewModel output. Do not embed HTTP requests or complex business rules in JSX.
- **ViewModel**: custom hooks named `use<Feature>ViewModel` that coordinate UI state, actions, Query hooks, navigation, transformations, and feature-specific behavior. ViewModels may use React hooks and must not render JSX.
- Keep feature-specific code together; extract cross-feature primitives only after a real reuse need emerges.
- Avoid duplicating TanStack Query caches in Zustand or local state.

## Suggested directory layout
```text
src/
  app/
    providers/              # QueryClientProvider, router integration, app composition
    router/                 # TanStack Router configuration / route tree
  routes/                   # Route modules, if using file-based routing
  features/
    users/
      model/
        types.ts
        users.api.ts
        users.queries.ts
      viewmodel/
        useUsersViewModel.ts
      view/
        UsersPage.tsx
        components/
          UserCard.tsx
      index.ts
  shared/
    components/             # Reusable UI primitives
    hooks/                  # Truly generic hooks
    lib/
      http/                 # Configured Axios instance, interceptors
      query/                # QueryClient defaults and helpers
    stores/                 # Cross-feature client state only
    types/
  styles/
    globals.css
```
Adapt to existing repository structure instead of reorganizing unnecessarily. For file-based routing, follow TanStack Router's generated route tree conventions; never manually edit generated files.

## State ownership decision rules
1. **Derived state**: compute from props, query results or other state during rendering; use `useMemo` only when computation cost or stable identity justifies it.
2. **`useState`**: component-owned transient state such as modal visibility, input draft, hover/selection, accordion state or temporary form UI. Keep it local unless multiple distant consumers need the same value.
3. **`useReducer`**: complicated local transitions involving related state values; do not introduce Zustand just because local state is complex.
4. **Zustand**: shared, client-owned state across unrelated components or routes (e.g., app-wide sidebar, multi-step draft, user UI preferences). Create small focused stores, selectors and explicit actions. Do not put fetched server entities in Zustand by default.
5. **TanStack Query**: remote data, loading/error status, cache, refetching, pagination, mutations and invalidation. Query keys must be deterministic and include all input parameters.
6. **TanStack Router**: URL-addressable state, such as search, filters, sorting, page and selected tab when deep links or browser navigation should preserve them. Validate search parameters.
7. **Context**: stable dependencies or scoped providers where appropriate, not a default replacement for Query or Zustand.

Do not mirror the same mutable value across `useState`, Zustand, TanStack Query and URL state. Select one owner and derive the rest.

## React and Hooks rules
- Follow the Rules of Hooks: top-level calls only in React components and custom hooks; never call hooks conditionally or inside event handlers.
- Prefer composition and small components to giant configurable components or deep prop drilling.
- Keep render pure; use effects only to synchronize with external systems, not to derive state that can be computed during render.
- Clean up subscriptions, listeners and timers. Prevent race conditions and stale closures.
- Use functional state updates when based on previous state.
- Avoid premature `useMemo`, `useCallback` and `React.memo`; apply only with a clear reason.
- Prefer controlled inputs when appropriate; ensure accessible labels, keyboard interactions and semantic HTML.
- Use stable, meaningful keys for lists; do not use array indices when item identity can change.

## HTTP and data access
- Use a centralized Axios instance with environment-based base URL and appropriate timeouts.
- Handle cancellation with `AbortSignal` from TanStack Query's query function where supported.
- Keep HTTP details in Model API/repository modules; do not call Axios from Views.
- Keep authentication, retries, token handling and error normalization centralized. Never log secrets.
- Use TanStack Query hooks/query options for reads and mutations; invalidate or update relevant queries after successful writes.
- Do not retry non-idempotent mutations automatically without explicit product requirements.
- Keep API DTOs distinct from UI/domain models when they differ materially.

## Routing
- Use TanStack Router exclusively for application routing.
- Prefer typed route definitions, typed navigation and validated search params.
- Keep route modules thin and delegate feature behavior to ViewModels.
- Handle not-found, loading and error states explicitly.

## Styling and componentization
- Use Tailwind utilities and the existing design tokens/theme; avoid arbitrary colors when tokens exist.
- Build reusable components for genuine repeated UI patterns, not speculative abstraction.
- Separate generic primitives (`shared/components`) from feature-specific components.
- Ensure responsive layouts, keyboard accessibility, visible focus and adequate contrast.
- Do not add another styling or component library without approval.

## TypeScript quality
- Avoid `any`, unsafe casts and non-null assertions unless justified and documented.
- Use explicit domain types and narrow `unknown` safely.
- Prefer type inference for obvious locals; use explicit types for public boundaries.
- Keep API contracts, route params, component props and store state typed.

## Working procedure
1. Inspect existing architecture, package scripts, dependencies and relevant components.
2. Identify state ownership (local, shared client, remote or URL) before coding.
3. Implement Model, ViewModel and View in the appropriate feature folder.
4. Reuse existing components, utilities and query keys.
5. Handle loading, empty, error and success states.
6. Run available repository checks (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`) only when scripts exist; report which were run and their outcomes.
7. Summarize changed files, architectural decisions, trade-offs and any remaining risks.

## Hard constraints
- Do not install packages or change major versions without approval.
- Do not edit generated files or commit secrets and `.env` credentials.
- Do not replace the chosen stack with Redux, React Router, fetch wrappers, CSS-in-JS or another state/query/router library without approval.
- Do not overengineer: introduce abstractions only when they reduce real complexity.
- Keep changes scoped to the requested feature and preserve existing behavior.

## Specialized skill
When implementing or reviewing React/MVVM features, consult the project's `SKILL.md` (or the installed `react-mvvm-frontend` skill) for decision trees, examples and acceptance checks. `AGENTS.md` and the actual repository configuration take precedence over generic skill examples.
