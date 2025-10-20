# Canary - AI Agent Instructions

## Project Overview

This is a **SvelteKit library** for server-side feature flagging using **SvelteKit Remote Functions**. It's packaged via `@sveltejs/package` and published to npm as `sveltekit-canary`.

**Critical Architecture**: All feature flag logic runs SERVER-SIDE via remote functions (`.remote.ts`). Configuration never leaks to the client. User state persists in httpOnly cookies.

## Core Concepts

### Remote Functions Pattern (`src/lib/features.remote.ts`)
- **Queries** (`query()`): Read-only operations that check features or get user info
- **Commands** (`command()`): State-changing operations that modify user groups
- All use `getRequestEvent()` to access cookies/request context
- Queries are reactive - components re-render when dependencies change

### Deterministic Hashing (`src/lib/utils/hash.ts`)
- User assignments are **deterministic**: same `userId` + `featureKey` = same result
- Uses `hashString()` to normalize user ID + feature key to 0-1 range
- Rollout percentages and variant assignments both use this hashing
- **Critical**: `isInRollout()` checks happen BEFORE variant assignment

### User Groups Bypass Logic
When a feature has `userGroups` defined:
- Users in those groups can access the feature **even if `enabled: false`**
- Users in groups **bypass rollout percentage** (get 100% access)
- This enables internal/beta testing of disabled or partially-rolled-out features
- See `checkFeature()` logic in `features.remote.ts` for implementation

### Cookie-Based State (`src/lib/utils/userContext.ts`)
- `canary_user_id`: Auto-generated user ID (persists 1 year)
- `canary_groups`: JSON array of user groups
- `canary_variants`: JSON object of feature → variant assignments
- **Important**: `getUserContext()` generates temporary IDs for queries, `ensureUserId()` persists them in commands

## File Organization

```
src/lib/
├── index.ts              # Public API exports
├── init.ts               # initCanary() - call once in hooks.server.ts
├── features.remote.ts    # Remote functions (checkFeature, joinGroup, etc.)
├── features.config.json  # Default static config (can be overridden)
├── components/           # Svelte 5 components using snippets
│   ├── Feature.svelte    # Main feature flag component
│   ├── BetaToggle.svelte # Group membership toggle
│   └── FeatureDebug.svelte
├── hooks/
│   └── featureRouting.ts # Server hook for route redirects
├── utils/
│   ├── configLoader.ts   # Config loading with TTL cache
│   ├── hash.ts           # Consistent hashing utilities
│   └── userContext.ts    # Cookie management
└── types/
    └── index.ts          # TypeScript definitions
```

## Development Workflow

### Build & Package
```powershell
npm run build          # Builds lib + runs prepack (svelte-package)
npm run prepack        # Sync + package + publint validation
npm run publish:check  # Full check before publishing
```

### Testing
- **Unit tests**: `vitest` with two projects (client/server)
  - Client: `*.svelte.{test,spec}.ts` - runs in Playwright browser
  - Server: `*.{test,spec}.ts` - runs in Node
- **E2E tests**: `playwright test` in `e2e/`
- Run all: `bun run test` (runs unit + e2e sequentially)

### Key Scripts
- `npm run check` - svelte-check for type validation
- `npm run lint` - Prettier + ESLint (flat config in `eslint.config.js`)
- `npm run dev` - Start dev server (demo app in `src/routes/`)

## Critical Dependencies

- **SvelteKit 2.x** with `experimental.remoteFunctions: true` (in `svelte.config.js`)
- **Svelte 5** with `compilerOptions.experimental.async: true` for await blocks in components
- **Valibot** for runtime schema validation of remote function params
- **Bun** is the package manager (see `bun run test`)

## Component Patterns (Svelte 5)

### Feature Component
Uses **snippets** (Svelte 5 pattern):
```svelte
<Feature flag="my-feature">
  {#snippet children({ variant })}
    <!-- Feature enabled content -->
  {/snippet}
  {#snippet fallback()}
    <!-- Disabled fallback -->
  {/snippet}
</Feature>
```

**Reactivity**: Uses `$derived.by()` to create dependency on `getUserInfo()` query - when user joins/leaves groups, all Feature components re-check.

### BetaToggle
Calls `joinGroup()`/`leaveGroup()` commands which trigger `getUserInfo().refresh()` to update all dependent queries.

## Configuration

### Static Config (`features.config.json`)
Default config loaded via import attributes: `with { type: 'json' }`

### Dynamic Config
Pass `configProvider` to `initCanary()`:
```typescript
initCanary({
  configProvider: async () => {
    const res = await fetch('https://api.example.com/features');
    return await res.json();
  },
  cacheTTL: 60  // Cache for 60 seconds
});
```

### Validation
`validateConfig()` in `configLoader.ts` checks:
- `enabled` is boolean
- `rollout` is 0-100
- Route definitions reference existing features
- All paths start with `/`

## Route Redirects (`handleFeatureRouting`)

Server hook that redirects based on:
1. **User group requirements**: `requiresGroup` → redirect if user not in group
2. **Feature flags**: `feature` + `enabled`/`disabled` routes
3. **Group-specific routes**: e.g., `beta: "/beta-features"`

Redirects use 307 (Temporary) to preserve request method.

## Testing Conventions

- **Determinism tests**: Verify same inputs produce same outputs (critical for hash functions)
- **Distribution tests**: Check rollout percentages distribute evenly (±10% tolerance over 1000 users)
- **Mock RequestEvent**: Create minimal mock with cookies Map for server utils tests
- Use `vitest.expect.requireAssertions: true` (in `vite.config.ts`)

## Common Gotchas

1. **Remote functions only work server-side** - components using them must handle async/await
2. **Don't persist user ID in queries** - only `command()` functions should call `ensureUserId()`
3. **Group bypass logic** - users in `userGroups` ignore `enabled` flag and rollout percentage
4. **Cache invalidation** - `invalidateCache()` only for testing, production uses TTL
5. **Svelte 5 snippets** - must use `{@render snippet()}` syntax, not old slots

## Publishing

Files included in package (see `package.json` files array):
- `dist/**` (built output from svelte-package)
- Excludes `*.test.*` and `*.spec.*` files

Entry points:
- `svelte: "./dist/index.js"` - main library export
- `types: "./dist/index.d.ts"` - TypeScript definitions
