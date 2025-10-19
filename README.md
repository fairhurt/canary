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
- 🎨 **Zero Config** - Works out of the box with sensible defaults

## Installation

```sh
npm install canary
# or
bun add canary
# or
pnpm add canary
```

## Quick Start

### 1. Enable Remote Functions

In your `svelte.config.js`:

```javascript
export default {
	kit: {
		experimental: {
			remoteFunctions: true
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};
```

### 2. Configure Your Features

Create `src/lib/features.config.json`:

```json
{
	"features": {
		"new-dashboard": {
			"enabled": true,
			"rollout": 100
		},
		"beta-feature": {
			"enabled": true,
			"rollout": 25,
			"userGroups": ["beta"]
		}
	}
}
```

### 3. Initialize the Library

In your `src/hooks.server.ts`:

```typescript
import { initCanary, handleFeatureRouting } from 'canary';
import { sequence } from '@sveltejs/kit/hooks';

// Initialize once at startup
initCanary();

// Add route handling
export const handle = sequence(handleFeatureRouting);
```

### 4. Use in Components

```svelte
<script>
	import { Feature } from 'canary';
</script>

<Feature flag="new-dashboard">
	{#snippet children()}
		<h1>New Dashboard</h1>
		<p>Welcome to the new experience!</p>
	{/snippet}

	{#snippet fallback()}
		<h1>Dashboard</h1>
		<p>Classic view</p>
	{/snippet}
</Feature>
```

## Configuration

### Feature Definition

```json
{
	"features": {
		"feature-key": {
			"enabled": true, // Required: globally enable/disable
			"rollout": 50, // Optional: percentage (0-100)
			"variants": ["a", "b", "c"], // Optional: A/B test variants
			"defaultVariant": "a", // Optional: default variant
			"userGroups": ["beta"], // Optional: required groups
			"description": "..." // Optional: documentation
		}
	}
}
```

### Route Redirects

```json
{
	"routes": {
		"/dashboard": {
			"feature": "new-dashboard",
			"enabled": "/dashboard-v2",
			"disabled": "/dashboard-v1"
		},
		"/beta": {
			"requiresGroup": "beta",
			"beta": "/beta-features"
		}
	}
}
```

## API Reference

### Initialization

```typescript
import { initCanary } from 'canary';

// Default (static JSON)
initCanary();

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

### Remote Functions

```typescript
import { checkFeature, getUserInfo, joinGroup, leaveGroup } from 'canary';

// Check a single feature
const result = await checkFeature('new-dashboard');
// { enabled: boolean, variant?: string }

// Check multiple features
const results = await checkFeatures(['feature1', 'feature2']);

// Get user context
const user = await getUserInfo();
// { userId: string, groups: string[], variants: Record<string, string> }

// Manage groups
await joinGroup('beta');
await leaveGroup('beta');
```

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

	{#snippet loading()}
		<div>Loading...</div>
	{/snippet}
</Feature>
```

#### `<BetaToggle>`

```svelte
<BetaToggle group="beta" />
<BetaToggle group="beta" label="Join Beta Program" />
```

#### `<FeatureDebug>`

```svelte
<FeatureDebug position="bottom-right" expanded={false} />
```

### Server Hook

```typescript
import { handleFeatureRouting } from 'canary';
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
			"rollout": 100,
			"variants": ["control", "variant-a", "variant-b"],
			"defaultVariant": "control"
		}
	}
}
```

```svelte
<Feature flag="homepage-test" let:variant>
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

### Dynamic Configuration

```typescript
// src/hooks.server.ts
import { initCanary } from 'canary';

initCanary({
	configProvider: async () => {
		// Fetch from your API
		const res = await fetch(process.env.FEATURE_FLAGS_API);
		return await res.json();
	},
	cacheTTL: 300 // Cache for 5 minutes
});
```

### Percentage Rollouts

Users are deterministically assigned based on their user ID, ensuring consistent experience:

```json
{
	"features": {
		"gradual-rollout": {
			"enabled": true,
			"rollout": 10 // Only 10% of users see this
		}
	}
}
```

## How It Works

1. **Server-Side Execution**: All feature flag logic runs on the server via SvelteKit remote functions
2. **Consistent Hashing**: User assignments are deterministic - same user always gets same variant
3. **Cookie-Based State**: User groups and variant assignments persist in cookies
4. **Zero Client Leakage**: Feature flag configuration never sent to the client
5. **Cached Evaluation**: Config is cached to avoid repeated lookups

## TypeScript

Full type safety out of the box:

```typescript
import type { FeatureFlagsConfig, FeatureCheckResult } from 'canary';

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

```sh
# Install dependencies
bun install

# Run type checking
bun run check

# Run tests
bun run test

# Build library
bun run build
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
