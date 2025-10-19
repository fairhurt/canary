<script lang="ts">
	import { Feature, BetaToggle, FeatureDebug } from '../lib/index.js';
</script>

<svelte:head>
	<title>Canary - Feature Flags for SvelteKit</title>
</svelte:head>

<main>
	<h1>🐤 Canary Demo</h1>
	<p class="subtitle">Feature Flagging for SvelteKit with Remote Functions</p>

	<section>
		<h2>Basic Feature Flag</h2>
		<Feature flag="new-dashboard">
			{#snippet children()}
				<div class="card success">
					<h3>✓ New Dashboard Enabled</h3>
					<p>You're seeing the new dashboard experience!</p>
				</div>
			{/snippet}

			{#snippet fallback()}
				<div class="card">
					<h3>Classic Dashboard</h3>
					<p>The new dashboard is not available yet.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<section>
		<h2>Beta Features</h2>
		<p>Toggle your beta status to see exclusive features:</p>

		<div class="controls">
			<BetaToggle group="beta" />
			<BetaToggle group="internal" label="Internal Team" />
		</div>

		<Feature flag="beta-checkout">
			{#snippet children()}
				<div class="card success">
					<h3>🎉 Beta Checkout</h3>
					<p>You have access to the new checkout flow!</p>
				</div>
			{/snippet}

			{#snippet fallback()}
				<div class="card muted">
					<h3>🔒 Beta Checkout</h3>
					<p>Join the beta group to access this feature.</p>
				</div>
			{/snippet}
		</Feature>

		<Feature flag="experimental-feature">
			{#snippet children()}
				<div class="card success">
					<h3>🧪 Experimental Feature</h3>
					<p>This is only visible to internal team members.</p>
				</div>
			{/snippet}

			{#snippet fallback()}
				<div class="card muted">
					<h3>🔒 Experimental Feature</h3>
					<p>This feature is internal only.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<section>
		<h2>A/B Testing</h2>
		<Feature flag="ab-test-homepage">
			{#snippet children({ variant }: { variant?: string })}
				<div class="card" class:variant-a={variant === 'variant-a'} class:variant-b={variant === 'variant-b'}>
					<h3>🎲 A/B Test Active</h3>
					<p>You're seeing: <strong>{variant || 'control'}</strong></p>
					<p>Your variant is assigned deterministically based on your user ID.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<section>
		<h2>Documentation</h2>
		<div class="card">
			<h3>📚 Getting Started</h3>
			<ol>
				<li>Configure features in <code>features.config.json</code></li>
				<li>Initialize Canary in <code>hooks.server.ts</code></li>
				<li>Use the <code>&lt;Feature&gt;</code> component in your pages</li>
				<li>Add beta toggles with <code>&lt;BetaToggle&gt;</code></li>
			</ol>
			<p>
				<a href="https://github.com/fairhurt/canary" target="_blank" rel="noopener">
					View on GitHub →
				</a>
			</p>
		</div>
	</section>
</main>

<!-- Debug panel -->
<FeatureDebug position="bottom-right" />

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: system-ui, -apple-system, sans-serif;
		background: #f5f5f5;
	}

	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		font-size: 3rem;
		margin: 0 0 0.5rem 0;
		color: #333;
	}

	.subtitle {
		font-size: 1.25rem;
		color: #666;
		margin: 0 0 3rem 0;
	}

	h2 {
		font-size: 1.5rem;
		margin: 3rem 0 1rem 0;
		color: #333;
	}

	section {
		margin-bottom: 3rem;
	}

	.card {
		background: white;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border-left: 4px solid #ccc;
	}

	.card.success {
		border-left-color: #28a745;
	}

	.card.muted {
		background: #f9f9f9;
		border-left-color: #999;
	}

	.card.variant-a {
		border-left-color: #007bff;
		background: #e7f3ff;
	}

	.card.variant-b {
		border-left-color: #6f42c1;
		background: #f3e7ff;
	}

	.card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
	}

	.card p {
		margin: 0;
		color: #666;
		line-height: 1.6;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
	}

	code {
		background: #f5f5f5;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
	}

	ol {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	li {
		margin-bottom: 0.5rem;
		color: #666;
	}

	a {
		color: #007bff;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
