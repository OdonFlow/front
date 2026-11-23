---
name: react-mvvm-frontend
description: Implement and review React 19 + TypeScript frontend features with MVVM, Axios, TanStack Query, TanStack Router, Zustand, Tailwind CSS, Vite and npm. Use for componentization, custom hooks, choosing state ownership, API integration, routing and frontend code review.
---

# React 19 + TypeScript MVVM Specialist

## Purpose
Guide an implementation agent to deliver accessible, composable, testable React features following the project's `AGENTS.md`. This skill provides workflows and examples; it is not an autonomous agent and does not override installed package versions.

## First: inspect before implementing
1. Read `AGENTS.md`, `package.json`, TypeScript/Vite/Tailwind configuration, route configuration and existing patterns.
2. Confirm whether TanStack Router is file-based or code-based and reuse that convention.
3. Identify existing Axios instance, query client, query key factories, Zustand stores and UI components.
4. Check existing scripts and tests. Never claim a check passed unless it was executed.
5. Determine the smallest feature scope and whether existing conventions supersede these illustrative examples.

## State selection algorithm
Ask in this order:

1. **Can the value be derived from existing props/state/query results?** Derive it; do not store a duplicate.
2. **Does it come from a backend or need caching, refetching, synchronization or mutation?** Use **TanStack Query**.
3. **Should the value survive refresh, be shareable as a link or participate in browser back/forward?** Use **TanStack Router validated search params**.
4. **Is it transient and used only by one component or a small parent-child subtree?** Use **`useState`**, lifting state only to the closest shared ancestor if necessary.
5. **Are local transitions numerous and coupled?** Consider **`useReducer`**.
6. **Is it client-owned and required by multiple distant components/features without a natural common owner?** Use **Zustand** with selectors.
7. **Is it a stable dependency shared by a subtree?** Consider **Context**.

### Examples
| Scenario | Owner | Reason |
|---|---|---|
| Open/close one modal | `useState` | Local, transient |
| Draft text in one search field | `useState` | Local until submitted |
| Server list of users | TanStack Query | Remote, cacheable |
| Create/update user | TanStack Query mutation | Remote side effect |
| Filter/sort/page in shareable URL | TanStack Router search | Deep-link and navigation semantics |
| Global sidebar expanded state | Zustand | Shared client UI state |
| Multi-page unsaved wizard draft | Zustand (if truly cross-route) | Shared client draft |
| `filteredUsers` from query + filter | Derived value | Avoid duplicated mutable state |
| Complex local wizard transitions | `useReducer` | Local transition logic |

**Anti-patterns:** copying `query.data` into Zustand, storing filtered arrays separately, using global stores for single-component toggles, using `useEffect` to calculate derived values, persisting credentials in browser storage without a reviewed security design.

## MVVM boundaries

### Model
- Define domain models and transport DTOs.
- Implement API functions through the configured Axios instance.
- Define Query options/keys and mutation functions close to the feature's data layer.
- Normalize transport errors and map DTOs where necessary.
- Never import React components into Model.

### ViewModel
- Implement a custom hook named `use<Feature>ViewModel`.
- Compose TanStack Query hooks, local state, Zustand selectors and router navigation/search when needed.
- Expose the minimum view-facing state and intent-based actions (`search`, `save`, `openDialog`), rather than leaking unrelated infrastructure.
- Keep pure formatting and mapping utilities separate when reusable.
- Do not render JSX.

### View
- Read the ViewModel output and render declarative UI.
- Forward events to ViewModel actions.
- Keep domain decisions and direct HTTP requests out of JSX.
- Implement loading, error, empty and success UI, plus semantic/accessibility requirements.
- Separate page composition from genuinely reusable presentational components.

## Worked example: users feature
These snippets are illustrative. Adapt imports, routing, versions and Query APIs to the actual repository.

### `model/types.ts`
```ts
export interface User {
  id: string;
  name: string;
  email: string;
}
```

### `model/users.api.ts`
```ts
import { http } from '@/shared/lib/http/client';
import type { User } from './types';

export async function getUsers(signal?: AbortSignal): Promise<User[]> {
  const { data } = await http.get<User[]>('/users', { signal });
  return data;
}
```

### `model/users.queries.ts`
```ts
import { queryOptions } from '@tanstack/react-query';
import { getUsers } from './users.api';

export const usersQueryOptions = queryOptions({
  queryKey: ['users'] as const,
  queryFn: ({ signal }) => getUsers(signal),
});
```

### `viewmodel/useUsersViewModel.ts`
```ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '../model/users.queries';

export function useUsersViewModel() {
  const [search, setSearch] = useState('');
  const usersQuery = useQuery(usersQueryOptions);

  const users = (usersQuery.data ?? []).filter((user) =>
    user.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  return {
    search,
    setSearch,
    users,
    isLoading: usersQuery.isPending,
    isError: usersQuery.isError,
    retry: () => void usersQuery.refetch(),
  };
}
```

### `view/UsersPage.tsx`
```tsx
import { useUsersViewModel } from '../viewmodel/useUsersViewModel';

export function UsersPage() {
  const vm = useUsersViewModel();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <label htmlFor="user-search" className="mt-4 block text-sm">
        Buscar usuários
      </label>
      <input
        id="user-search"
        className="mt-1 w-full rounded border p-2"
        value={vm.search}
        onChange={(event) => vm.setSearch(event.target.value)}
      />
      {vm.isLoading && <p role="status">Carregando...</p>}
      {vm.isError && (
        <div role="alert">
          <p>Não foi possível carregar os usuários.</p>
          <button type="button" onClick={vm.retry}>Tentar novamente</button>
        </div>
      )}
      {!vm.isLoading && !vm.isError && vm.users.length === 0 && (
        <p>Nenhum usuário encontrado.</p>
      )}
      {!vm.isLoading && !vm.isError && (
        <ul className="mt-4 space-y-2">
          {vm.users.map((user) => <li key={user.id}>{user.name}</li>)}
        </ul>
      )}
    </main>
  );
}
```

In this example, `search` is intentionally local. If search should be bookmarkable, move it to typed TanStack Router search params rather than duplicating it in local state.

## Zustand usage pattern
Use a store only when multiple distant consumers require the same client-owned state:

```ts
import { create } from 'zustand';

type LayoutState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

Subscribe to the smallest necessary slice:

```ts
const sidebarOpen = useLayoutStore((state) => state.sidebarOpen);
const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
```

Avoid selecting the entire store when only one field is needed. Keep stores focused; add persistence only with a product requirement and a reviewed storage/security strategy.

## Axios + TanStack Query responsibilities
- Configure Axios once; use environment variables with the `VITE_` prefix only for public build-time configuration. Never place secrets in frontend environment variables.
- Pass the Query-provided `signal` into Axios requests for cancellation.
- Design query keys around resources and parameters; invalidate affected keys after successful mutations.
- Choose stale time, retries, optimistic updates and error handling based on user experience and data semantics; do not blindly apply global defaults.
- Differentiate initial loading from background fetching where UI requires it.
- Prefer mutation state and query invalidation to ad hoc event buses.

## TanStack Router responsibilities
- Follow the project's chosen file-based or code-based route setup.
- Use typed navigation and validated search params for shareable filters, sorting and pagination.
- Keep route definitions thin; place feature UI in Views and behavior in ViewModels.
- Avoid maintaining a second copy of route state in Zustand.

## React 19 and hooks review
- Enforce hook ordering and pure rendering.
- Use `useState` for local state, `useReducer` for coupled local transitions and `useEffect` only for external synchronization.
- Do not add `useMemo`, `useCallback` or `memo` mechanically; justify performance optimizations.
- Avoid stale closures and ensure effect cleanup.
- Check React 19-compatible patterns and actual installed library versions; do not assume legacy patterns are mandatory.
- Prefer accessible native controls and proper focus management.

## Componentization checklist
- Does the component have a single clear UI responsibility?
- Is state located at the narrowest reasonable owner?
- Are domain decisions outside the View?
- Are props typed and minimal?
- Is a shared component truly reused, or prematurely abstracted?
- Are empty/loading/error states covered?
- Does keyboard navigation work and are controls labeled?
- Does Tailwind follow existing tokens and responsive conventions?

## Implementation workflow
1. Describe feature requirements and data flow.
2. Classify each state value as derived, local, shared client, server or URL state.
3. Inspect existing code before creating files or adding dependencies.
4. Implement Model API/types/query definitions.
5. Implement ViewModel orchestration and actions.
6. Implement View and feature-specific components.
7. Add or update tests using the project's existing test tooling; do not install a new test framework without approval.
8. Run available lint, typecheck, test and build scripts; report actual results.
9. Review MVVM boundaries, state duplication, accessibility and network behavior.

## Definition of done
- React 19 and TypeScript conventions followed.
- MVVM separation is clear and proportional to complexity.
- No unnecessary global state or duplicated server cache.
- Axios, Query, Router and Zustand each serve their intended responsibility.
- Loading, error, empty and success states are handled.
- UI is responsive and accessible.
- Existing checks pass, or failures and skipped checks are explicitly reported.
- No unapproved dependencies or unrelated changes.
