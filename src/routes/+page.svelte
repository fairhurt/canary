<script lang="ts">
	import { Feature, BetaToggle, FeatureDebug } from '../lib/index.js';
</script>

<svelte:head>
	<title>Canary - Feature Flags for SvelteKit</title>
</svelte:head>

{#snippet controlGroup()}
	<div class="variant-box control">
		<strong>🎯 Control Group</strong>
		<p>You see the original experience (baseline)</p>
	</div>
{/snippet}

{#snippet variantA()}
	<div class="variant-box variant-a">
		<strong>🔵 Variant A</strong>
		<p>You see the blue variation with new CTA</p>
	</div>
{/snippet}

{#snippet variantB()}
	<div class="variant-box variant-b">
		<strong>🟣 Variant B</strong>
		<p>You see the purple variation with hero image</p>
	</div>
{/snippet}

<main>
	<h1>🐤 Canary Demo</h1>
	<p class="subtitle">Feature Flagging for SvelteKit with Remote Functions</p>

	<!-- User Group Controls -->
	<section class="hero">
		<div class="card">
			<h2>👥 User Groups</h2>
			<p>Join beta or internal groups to unlock features. Changes take effect instantly!</p>
			<div class="controls">
				<BetaToggle group="beta" />
				<BetaToggle group="internal" label="Internal Team" />
			</div>
		</div>
	</section>

	<!-- Basic Feature Flag -->
	<section>
		<h2>1️⃣ Basic Feature Flag</h2>
		<p class="description">
			Simple on/off feature toggle. <code>new-dashboard</code> is enabled at 100% rollout.
		</p>
		<Feature flag="new-dashboard">
			<div class="card success">
				<h3>✓ New Dashboard Enabled</h3>
				<p>You're seeing the new dashboard experience!</p>
				<p class="meta">Feature: <code>enabled: true</code>, <code>rollout: 100</code></p>
			</div>

			{#snippet fallback()}
				<div class="card muted">
					<h3>Classic Dashboard</h3>
					<p>The new dashboard is not available yet.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<!-- Percentage Rollout -->
	<section>
		<h2>2️⃣ Percentage Rollout</h2>
		<p class="description">
			Feature <code>gradual-rollout</code> is enabled for 50% of visitors. Your user ID is hashed together
			with the feature key, so you land in the same bucket on every visit.
		</p>
		<Feature flag="gradual-rollout">
			<div class="card success">
				<h3>🎲 You're in the rollout</h3>
				<p>You are one of the 50% of visitors who get this feature.</p>
				<p class="meta">Feature: <code>enabled: true</code>, <code>rollout: 50</code></p>
			</div>

			{#snippet fallback()}
				<div class="card muted">
					<h3>⏳ Not rolled out to you yet</h3>
					<p>You are in the 50% of visitors who don't have this feature yet.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<!-- User Groups -->
	<section>
		<h2>3️⃣ Group-Gated Feature</h2>
		<p class="description">
			Feature <code>beta-checkout</code> lists <code>userGroups</code>, so
			<strong>only members of the beta or internal group get it</strong>.
		</p>
		<Feature flag="beta-checkout">
			<div class="card success">
				<h3>🎉 Beta Checkout Unlocked!</h3>
				<p>You have access to the new checkout flow!</p>
				<p class="meta">
					Feature: <code>enabled: true</code>, <code>userGroups: ["beta", "internal"]</code>
				</p>
			</div>

			{#snippet fallback()}
				<div class="card muted">
					<h3>🔒 Beta Checkout Locked</h3>
					<p>Join the beta group above to unlock this feature.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<!-- User Groups (Disabled Feature) -->
	<section>
		<h2>4️⃣ Disabled Feature Override</h2>
		<p class="description">
			Feature <code>experimental-feature</code> is disabled (<code>enabled: false</code>), but
			<strong>internal group members can still access it</strong>. Use this to test a feature in
			production before turning it on for anyone else.
		</p>
		<Feature flag="experimental-feature">
			<div class="card success">
				<h3>🧪 Experimental Feature Active!</h3>
				<p>This feature is disabled globally, but you're in the internal group!</p>
				<p class="meta">
					Feature: <code>enabled: false</code>, <code>userGroups: ["internal"]</code>
				</p>
			</div>

			{#snippet fallback()}
				<div class="card muted">
					<h3>🔒 Experimental Feature</h3>
					<p>This feature is internal only. Join the internal team to access it.</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<!-- A/B Testing -->
	<section>
		<h2>5️⃣ A/B Testing with Variants</h2>
		<p class="description">
			Feature <code>ab-test-homepage</code> has 3 variants: control, variant-a, variant-b. Your variant
			is assigned deterministically based on your user ID.
		</p>
		<Feature flag="ab-test-homepage">
			{#snippet children({ variant })}
				<div
					class="card"
					class:variant-a={variant === 'variant-a'}
					class:variant-b={variant === 'variant-b'}
					class:control={variant === 'control'}
				>
					<h3>🎲 A/B Test Active</h3>
					<p>You're seeing: <strong>{variant || 'control'}</strong></p>
					<p>Your variant is consistent across sessions and won't change randomly.</p>
					<p class="meta">
						Feature: <code>variants: ["control", "variant-a", "variant-b"]</code>
					</p>
				</div>
			{/snippet}
		</Feature>

		<!-- Alternative: one snippet per variant -->
		<div class="card">
			<h4>Alternative: one snippet per variant</h4>
			<p class="small">
				Pass a <code>variants</code> record to render a different snippet for each variant.
			</p>
			<Feature
				flag="ab-test-homepage"
				variants={{ control: controlGroup, 'variant-a': variantA, 'variant-b': variantB }}
			/>
		</div>
	</section>

	<!-- Loading & Error States -->
	<section>
		<h2>6️⃣ Loading & Error States</h2>
		<p class="description">
			Features can show custom loading and error states while checking flags. Without a
			<code>loading</code> snippet the result is server-rendered, so there is nothing to wait for.
		</p>
		<Feature flag="new-dashboard">
			{#snippet loading()}
				<div class="card loading">
					<h3>⏳ Checking feature status...</h3>
					<p>Loading your personalized experience.</p>
				</div>
			{/snippet}

			<div class="card success">
				<h3>✓ Loaded Successfully</h3>
				<p>Feature check complete! (This happens so fast you might not see the loading state)</p>
			</div>

			{#snippet error(err)}
				<div class="card error">
					<h3>❌ Error</h3>
					<p>Failed to check feature: {err instanceof Error ? err.message : String(err)}</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<!-- Route Redirects -->
	<section>
		<h2>7️⃣ Route Redirects</h2>
		<p class="description">
			The <code>handleFeatureRouting</code> hook redirects requests based on the
			<code>routes</code> config, before the page is rendered.
		</p>
		<div class="card">
			<!-- Plain links with a full page load: the redirects happen on the server -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<ul>
				<li>
					<a href="/dashboard" data-sveltekit-reload>/dashboard</a> → <code>/dashboard-v2</code>
					while <code>new-dashboard</code> is enabled, otherwise <code>/dashboard-v1</code>
				</li>
				<li>
					<a href="/checkout" data-sveltekit-reload>/checkout</a> → <code>/checkout-beta</code> for beta
					members
				</li>
				<li>
					<a href="/checkout-beta" data-sveltekit-reload>/checkout-beta</a> → back to
					<code>/checkout</code> unless you are in the beta group
				</li>
				<li>
					<a href="/admin" data-sveltekit-reload>/admin</a> → home unless you are in the internal group
				</li>
			</ul>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
	</section>

	<!-- Testing Instructions -->
	<section>
		<h2>🧪 Test Scenarios</h2>
		<div class="card info">
			<h3>How to Test</h3>
			<ol>
				<li>
					<strong>Basic Flag:</strong> Section 1 should always show "New Dashboard Enabled" (100% rollout)
				</li>
				<li>
					<strong>Rollout:</strong> Section 2 is on for half of all visitors. Open a private window to
					get a new user ID and (maybe) a different result
				</li>
				<li>
					<strong>Group Gate:</strong> Click "Join beta" - Section 3 should unlock immediately without
					a page refresh
				</li>
				<li>
					<strong>Disabled Override:</strong> Click "Internal Team" - Section 4 should appear
					(overrides
					<code>enabled: false</code>)
				</li>
				<li>
					<strong>A/B Variants:</strong> Section 5 shows your assigned variant (consistent across refreshes)
				</li>
				<li>
					<strong>Group Toggle:</strong> Leave beta/internal - features should hide instantly without
					a refresh
				</li>
				<li>
					<strong>Redirects:</strong> Follow the links in Section 7 before and after joining a group
				</li>
			</ol>
		</div>
	</section>

	<section>
		<h2>📚 Documentation</h2>
		<div class="card">
			<h3>Quick Start</h3>
			<ol>
				<li>Define your features in <code>features.config.json</code></li>
				<li>
					Pass the config to <code>initCanary()</code> and add <code>handleFeatureRouting</code> in
					<code>hooks.server.ts</code>
				</li>
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
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
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

	.hero {
		margin-bottom: 2rem;
	}

	.description {
		color: #666;
		margin: 0 0 1rem 0;
		line-height: 1.6;
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
		background: #f0fff4;
	}

	.card.muted {
		background: #f9f9f9;
		border-left-color: #999;
	}

	.card.info {
		border-left-color: #17a2b8;
		background: #e7f9fc;
	}

	.card.loading {
		border-left-color: #ffc107;
		background: #fff8e1;
	}

	.card.error {
		border-left-color: #dc3545;
		background: #ffe7e7;
	}

	.card.control {
		border-left-color: #6c757d;
		background: #f8f9fa;
	}

	.card.variant-a {
		border-left-color: #007bff;
		background: #e7f3ff;
	}

	.card.variant-b {
		border-left-color: #6f42c1;
		background: #f3e7ff;
	}

	.card h3,
	.card h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #333;
	}

	.card h4 {
		font-size: 1.1rem;
		margin-top: 1rem;
	}

	.card p {
		margin: 0;
		color: #666;
		line-height: 1.6;
	}

	.card p + p {
		margin-top: 0.5rem;
	}

	.meta {
		font-size: 0.875rem;
		color: #999 !important;
		margin-top: 0.75rem !important;
		font-family: 'Courier New', monospace;
	}

	.small {
		font-size: 0.9rem;
		color: #999;
	}

	.variant-box {
		padding: 1rem;
		border-radius: 0.375rem;
		border: 2px solid;
		margin-top: 0.5rem;
	}

	.variant-box.control {
		border-color: #6c757d;
		background: #f8f9fa;
	}

	.variant-box.variant-a {
		border-color: #007bff;
		background: #e7f3ff;
	}

	.variant-box.variant-b {
		border-color: #6f42c1;
		background: #f3e7ff;
	}

	.variant-box strong {
		display: block;
		margin-bottom: 0.25rem;
		color: #333;
	}

	.variant-box p {
		margin: 0;
		font-size: 0.9rem;
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

	ol,
	ul {
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
