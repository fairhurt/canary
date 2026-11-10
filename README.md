# 🐤 Canary

A modern, type-safe feature flagging library for SvelteKit using [Remote Functions](https://svelte.dev/docs/kit/remote-functions).

## Features

- ✅ **Server-Side Logic** - All feature checks happen on the server using SvelteKit's remote functions
- 🎯 **Type-Safe** - Full TypeScript support with autocomplete
- 🎲 **A/B Testing** - Deterministic variant assignment with consistent hashing
- 👥 **User Groups** - Beta testing, internal testing, and custom group support
- 🚏 **Route Redirects** - Automatic route redirects based on feature flags
- 📊 **Percentage Rollouts** - Gradually roll out features to a percentage of users
- 🔄 **Flexible Config** - Static JSON or dynamic remote configuration
- ⚡ **Server-Rendered** - Flags are resolved during SSR, so there is no flash of the wrong content

## Requirements

- SvelteKit 3 (`@sveltejs/kit` ^3.0.0)
- Svelte 5.57 or newer

## Installation

```sh
npm install sveltekit-canary
# or
bun add sveltekit-canary
# or
pnpm add sveltekit-canary
```

## Quick Start

### 1. Enable Remote Functions

Remote functions and async components are still experimental, so turn them on in your `vite.config.js`:

```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: {
					async: true
				}
			},
			experimental: {
				remoteFunctions: true
			}
		})
	]
});
```

### 2. Configure Your Features

Create `src/features.config.json`:

```json
{
	"features": {
		"new-dashboard": {
			"enabled": true,
			"rollout": 100
		},
		"beta-feature": {
			"enabled": true,
			"userGroups": ["beta"]
		}
	}
}
```

### 3. Initialize the Library

In your `src/hooks.server.ts`:

```typescript
import { initCanary, handleFeatureRouting } from 'sveltekit-canary';
import { sequence } from '@sveltejs/kit/hooks';
import config from './features.config.json';

// Initialize once at startup
initCanary({ config });

// Keeps each visitor's ID stable and applies route redirects
export const handle = sequence(handleFeatureRouting);
```

> `handleFeatureRouting` is what stores the visitor's ID cookie. Without it, a visitor who has never joined a group gets a new ID on every request, so percentage rollouts and A/B variants will not stay consistent for them.

### 4. Use in Components

```svelte
<script>
	import { Feature } from 'sveltekit-canary';
</script>

<Feature flag="new-dashboard">
	<h1>New Dashboard</h1>
	<p>Welcome to the new experience!</p>

	{#snippet fallback()}
		<h1>Dashboard</h1>
		<p>Classic view</p>
	{/snippet}
</Feature>
```

## Configuration

### Feature Definition

| Property         | Type       | Description                                                            |
| ---------------- | ---------- | ---------------------------------------------------------------------- |
| `enabled`        | `boolean`  | Required. Globally enable or disable the feature                       |
| `rollout`        | `number`   | Percentage of users who get the feature, 0-100 (default 100)           |
| `variants`       | `string[]` | Variants for A/B testing                                               |
| `defaultVariant` | `string`   | Must be one of `variants`                                              |
| `userGroups`     | `string[]` | Restrict the feature to these groups (see [User Groups](#user-groups)) |
| `description`    | `string`   | Documentation only                                                     |

```json
{
	"features": {
		"feature-key": {
			"enabled": true,
			"rollout": 50,
			"variants": ["a", "b", "c"],
			"defaultVariant": "a",
			"description": "..."
		}
	}
}
```

For editor autocomplete and validation, point `$schema` at the bundled JSON schema:

```json
{
	"$schema": "../node_modules/sveltekit-canary/dist/features.schema.json",
	"features": {}
}
```

### User Groups

When a feature lists `userGroups`, **only members of those groups get it**:

- Members get the feature even if `enabled` is `false`, so you can test in production before launch
- Members always get the feature, whatever `rollout` is set to
- Everyone else does not get the feature

```json
{
	"features": {
		"beta-checkout": {
			"enabled": true,
			"userGroups": ["beta", "internal"]
		},
		"experimental-feature": {
			"enabled": false,
			"userGroups": ["internal"]
		}
	}
}
```

Group membership is stored in a cookie and is self-service: anyone can call `joinGroup('internal')`. Groups are for opting in to previews, **not for access control**. Protect anything sensitive with your own authentication.

### Route Redirects

```json
{
	"routes": {
		"/dashboard": {
			"feature": "new-dashboard",
			"enabled": "/dashboard-v2",
			"disabled": "/dashboard-v1"
		},
		"/checkout": {
			"beta": "/checkout-beta"
		},
		"/checkout-beta": {
			"requiresGroup": "beta",
			"disabled": "/checkout"
		},
		"/admin": {
			"requiresGroup": "internal"
		}
	}
}
```

| Property        | Description                                                                              |
| --------------- | ---------------------------------------------------------------------------------------- |
| `feature`       | Feature flag that controls this route                                                    |
| `enabled`       | Where to redirect when `feature` is enabled for the user                                 |
| `disabled`      | Where to redirect when `feature` is disabled, or the user is not in `requiresGroup`      |
| `requiresGroup` | Only members of this group may visit the route. Others go to `disabled`, or `/` if unset |
| `<group name>`  | Any other key is a group name: members of that group are redirected to its value         |

Redirects are applied by the server hook, so they run on full page loads and on any navigation that reaches the server. A client-side navigation to a page with no server `load` function never reaches the server; add `data-sveltekit-reload` to links that point at redirected routes.

## API Reference

### Initialization

```typescript
import { initCanary } from 'sveltekit-canary';
import config from './features.config.json';

// Static config
initCanary({ config });

// Custom config provider
initCanary({
	configProvider: async () => {
		const res = await fetch('https://api.example.com/features');
		return await res.json();
	},
	cacheTTL: 60, // Cache for 60 seconds
	debug: true
});
```

| Option           | Default            | Description                                                           |
| ---------------- | ------------------ | --------------------------------------------------------------------- |
| `config`         | `{ features: {} }` | Static configuration                                                  |
| `configProvider` | -                  | Function returning the config. Takes precedence over `config`         |
| `cacheTTL`       | `300`              | Seconds to cache the provider's result. `0` calls it on every request |
| `debug`          | `false`            | Log the options at startup                                            |
| `userIdCookie`   | `canary_user_id`   | Cookie name for the user ID                                           |
| `groupsCookie`   | `canary_groups`    | Cookie name for the user's groups                                     |
| `variantsCookie` | `canary_variants`  | Cookie name for persisted variant assignments                         |

`defineConfig` gives you type checking if you would rather write the config in TypeScript:

```typescript
// src/features.config.ts
import { defineConfig } from 'sveltekit-canary';

export default defineConfig({
	features: {
		'new-dashboard': { enabled: true, rollout: 100 }
	}
});
```

### Remote Functions

```svelte
<script>
	import { checkFeature, checkFeatures, getUserInfo, joinGroup } from 'sveltekit-canary';

	// Check a single feature: { enabled: boolean, variant?: string, reason?: string }
	// Calls made at the same time are batched into one request
	const dashboard = $derived(await checkFeature('new-dashboard'));

	// Check several features at once: Record<string, FeatureCheckResult>
	const flags = $derived(await checkFeatures(['feature1', 'feature2']));

	// Get user context: { userId: string, groups: string[], variants: Record<string, string> }
	const user = $derived(await getUserInfo());

	async function joinBeta() {
		// Changing groups changes what features resolve to. `.updates(...)` refreshes
		// the listed queries in the same round trip, so the page updates instantly
		await joinGroup('beta').updates(getUserInfo, checkFeature, checkFeatures);
	}
</script>

{#if dashboard.enabled}
	<NewDashboard />
{/if}

<button onclick={joinBeta}>Join the beta</button>
```

`leaveGroup(group)` works the same way as `joinGroup(group)`.

### Components

#### `<Feature>`

```svelte
<Feature flag="new-dashboard">
	{#snippet children({ variant })}
		<div>Feature enabled! Variant: {variant}</div>
	{/snippet}

	{#snippet fallback()}
		<div>Feature disabled</div>
	{/snippet}

	{#snippet error(err)}
		<div>Could not check the feature</div>
	{/snippet}
</Feature>
```

| Prop       | Description                                                                       |
| ---------- | --------------------------------------------------------------------------------- |
| `flag`     | Feature key to check                                                              |
| `children` | Rendered when the feature is enabled. Receives `{ variant }`                      |
| `fallback` | Rendered when the feature is disabled                                             |
| `variants` | Record of variant name to snippet. Takes precedence over `children`               |
| `error`    | Rendered if the check fails                                                       |
| `loading`  | Rendered while the check is pending. See the note below before you reach for this |

By default the feature is resolved on the server and the result is part of the server-rendered HTML. If you pass a `loading` snippet, the server renders that snippet instead and the check happens in the browser.

#### `<BetaToggle>`

A button that joins or leaves a group, and refreshes every `<Feature>` on the page.

```svelte
<BetaToggle group="beta" />
<BetaToggle group="beta" label="Beta Program" class="my-button" />
```

#### `<FeatureDebug>`

A floating panel showing the current user's ID, groups and variants.

```svelte
<FeatureDebug position="bottom-right" expanded={false} />
```

### Server Hook

```typescript
import { handleFeatureRouting } from 'sveltekit-canary';
import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(
	handleFeatureRouting
	// your other hooks...
);
```

## Advanced Usage

### A/B Testing

```json
{
	"features": {
		"homepage-test": {
			"enabled": true,
			"variants": ["control", "variant-a", "variant-b"],
			"defaultVariant": "control"
		}
	}
}
```

Either branch on the variant yourself:

```svelte
<Feature flag="homepage-test">
	{#snippet children({ variant })}
		{#if variant === 'variant-a'}
			<HomePageA />
		{:else if variant === 'variant-b'}
			<HomePageB />
		{:else}
			<HomePageControl />
		{/if}
	{/snippet}
</Feature>
```

Or pass one snippet per variant:

```svelte
{#snippet control()}<HomePageControl />{/snippet}
{#snippet variantA()}<HomePageA />{/snippet}
{#snippet variantB()}<HomePageB />{/snippet}

<Feature
	flag="homepage-test"
	variants={{ control, 'variant-a': variantA, 'variant-b': variantB }}
/>
```

### Dynamic Configuration

```typescript
// src/hooks.server.ts
import { initCanary } from 'sveltekit-canary';
import { env } from '$env/dynamic/private';
import fallback from './features.config.json';

initCanary({
	configProvider: async () => {
		// Fetch from your API
		const res = await fetch(env.FEATURE_FLAGS_API);
		return await res.json();
	},
	// Used if the provider fails before it has ever succeeded
	config: fallback,
	cacheTTL: 300 // Cache for 5 minutes
});
```

If the provider throws or returns an invalid config, Canary keeps serving the last good config and tries again after `cacheTTL`.

### Percentage Rollouts

Users are deterministically assigned based on their user ID, ensuring a consistent experience:

```json
{
	"features": {
		"gradual-rollout": {
			"enabled": true,
			"rollout": 10
		}
	}
}
```

Only 10% of users see this feature. Raising the percentage later keeps everyone who already had it.

## How It Works

1. **Server-Side Execution**: All feature flag logic runs on the server via SvelteKit remote functions
2. **Consistent Hashing**: User assignments are deterministic - same user always gets same variant
3. **Cookie-Based State**: The user ID, groups and variant assignments persist in httpOnly cookies
4. **Zero Client Leakage**: Feature flag configuration is never sent to the client, only the result of each check
5. **Cached Evaluation**: Config is cached to avoid repeated lookups

## TypeScript

Full type safety out of the box:

```typescript
import type { FeatureFlagsConfig, FeatureCheckResult } from 'sveltekit-canary';

// Type-safe config
const config: FeatureFlagsConfig = {
	features: {
		'my-feature': {
			enabled: true
		}
	}
};
```

## Development

The repository doubles as a demo app: `src/lib` is the library, `src/routes` and `src/features.config.json` are the demo.

```sh
# Install dependencies
bun install

# Run the demo app
bun run dev

# Run type checking
bun run check

# Run unit and end-to-end tests
bun run test

# Build library
bun run build
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
