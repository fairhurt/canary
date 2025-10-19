<script lang="ts">
	import { Feature, BetaToggle, FeatureDebug } from '../lib/index.js';
</script>

<svelte:head>
	<title>Canary - Feature Flags for SvelteKit</title>
</svelte:head>

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
			{#snippet children()}
				<div class="card success">
					<h3>✓ New Dashboard Enabled</h3>
					<p>You're seeing the new dashboard experience!</p>
					<p class="meta">Feature: <code>enabled: true</code>, <code>rollout: 100</code></p>
				</div>
			{/snippet}

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
			Feature <code>beta-checkout</code> has a 25% rollout.
			<strong>Users in beta/internal groups bypass rollout and get 100% access.</strong>
		</p>
		<Feature flag="beta-checkout">
			{#snippet children()}
				<div class="card success">
					<h3>🎉 Beta Checkout Unlocked!</h3>
					<p>You have access to the new checkout flow!</p>
					<p class="meta">
						Feature: <code>enabled: true</code>, <code>rollout: 25</code>,
						<code>userGroups: ["beta", "internal"]</code>
					</p>
				</div>
			{/snippet}

			{#snippet fallback()}
				<div class="card muted">
					<h3>🔒 Beta Checkout Locked</h3>
					<p>
						This feature has a 25% rollout. Join the beta group to guarantee access, or you might be
						randomly included!
					</p>
				</div>
			{/snippet}
		</Feature>
	</section>

	<!-- User Groups (Disabled Feature) -->
	<section>
		<h2>3️⃣ User Groups (Disabled Feature Override)</h2>
		<p class="description">
			Feature <code>experimental-feature</code> is disabled (<code>enabled: false</code>), but
			<strong>internal group members can still access it</strong>. This tests that userGroups bypass
			the enabled flag.
		</p>
		<Feature flag="experimental-feature">
			{#snippet children()}
				<div class="card success">
					<h3>🧪 Experimental Feature Active!</h3>
					<p>This feature is disabled globally, but you're in the internal group!</p>
					<p class="meta">
						Feature: <code>enabled: false</code>, <code>userGroups: ["internal"]</code>
					</p>
				</div>
			{/snippet}

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
		<h2>4️⃣ A/B Testing with Variants</h2>
		<p class="description">
			Feature <code>ab-test-homepage</code> has 3 variants: control, variant-a, variant-b. Your variant
			is assigned deterministically based on your user ID.
		</p>
		<Feature flag="ab-test-homepage">
			{#snippet children({ variant }: { variant?: string })}
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

		<!-- Alternative variant display method -->
		<div class="card">
			<h4>Alternative: Conditional rendering per variant</h4>
			<p class="small">You can use if/else blocks to render different content for each variant.</p>
			<Feature flag="ab-test-homepage">
				{#snippet children({ variant })}
					<div
						class="variant-box"
						class:control={variant === 'control'}
						class:variant-a={variant === 'variant-a'}
						class:variant-b={variant === 'variant-b'}
					>
						{#if variant === 'control'}
							<strong>🎯 Control Group</strong>
							<p>You see the original experience (baseline)</p>
						{:else if variant === 'variant-a'}
							<strong>🔵 Variant A</strong>
							<p>You see the blue variation with new CTA</p>
						{:else if variant === 'variant-b'}
							<strong>🟣 Variant B</strong>
							<p>You see the purple variation with hero image</p>
						{/if}
					</div>
				{/snippet}
			</Feature>
		</div>
	</section>

	<!-- Loading & Error States -->
	<section>
		<h2>5️⃣ Loading & Error States</h2>
		<p class="description">
			Features can show custom loading and error states while checking flags.
		</p>
		<Feature flag="new-dashboard">
			{#snippet loading()}
				<div class="card loading">
					<h3>⏳ Checking feature status...</h3>
					<p>Loading your personalized experience.</p>
				</div>
			{/snippet}

			{#snippet children()}
				<div class="card success">
					<h3>✓ Loaded Successfully</h3>
					<p>Feature check complete! (This happens so fast you might not see the loading state)</p>
				</div>
			{/snippet}

			{#snippet error(err)}
				<div class="card error">
					<h3>❌ Error</h3>
					<p>Failed to check feature: {err.message}</p>
				</div>
			{/snippet}
		</Feature>
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
					<strong>Rollout Bypass:</strong> Click "Join beta" - Section 2 should unlock immediately without
					page refresh (bypasses 25% rollout)
				</li>
				<li>
					<strong>Disabled Override:</strong> Click "Join internal" - Section 3 should appear
					(overrides <code>enabled: false</code>)
				</li>
				<li>
					<strong>A/B Variants:</strong> Section 4 shows your assigned variant (consistent across refreshes)
				</li>
				<li>
					<strong>Group Toggle:</strong> Leave beta/internal - features should hide instantly without
					refresh
				</li>
			</ol>
		</div>
	</section>

	<section>
		<h2>📚 Documentation</h2>
		<div class="card">
			<h3>Quick Start</h3>
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
