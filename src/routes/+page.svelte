<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import {
		Feature,
		FeatureDebug,
		checkFeature,
		checkFeatures,
		getUserInfo,
		joinGroup,
		leaveGroup
	} from '../lib/index.js';
	import {
		getDemoState,
		getRouteDestinations,
		getVariantDistribution,
		resetIdentity
	} from './demo.remote.js';
	import Code from './Code.svelte';
	import * as snippets from './snippets.js';

	const GROUPS = ['beta', 'internal'];
	const VARIANT_COLORS: Record<string, string> = {
		control: '#ffd60a',
		'variant-a': '#38bdf8',
		'variant-b': '#c084fc'
	};
	const cells = Array.from({ length: 100 }, (_, i) => i);

	const FLAGS = [
		'new-dashboard',
		'gradual-rollout',
		'beta-checkout',
		'experimental-feature',
		'ab-test-homepage'
	];

	/** Simulated rollout percentage; the real config is 50 */
	let rollout = $state(50);
	let busy = $state<string | null>(null);
	let copied = $state(false);

	async function toggleGroup(group: string) {
		busy = group;
		try {
			const { groups } = await getUserInfo();
			const change = groups.includes(group) ? leaveGroup : joinGroup;

			// One round trip: the cookie changes and every flag comes back re-evaluated
			await change(group).updates(getUserInfo, checkFeature, checkFeatures);
			await getRouteDestinations().refresh();
		} finally {
			busy = null;
		}
	}

	async function newIdentity() {
		busy = 'identity';
		try {
			await resetIdentity().updates(
				getUserInfo,
				getDemoState,
				getRouteDestinations,
				checkFeature,
				checkFeatures
			);
		} finally {
			busy = null;
		}
	}

	async function copyInstall() {
		try {
			await navigator.clipboard.writeText(snippets.install);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard access can be denied; the command is still selectable
		}
	}
</script>

<svelte:head>
	<title>Canary - Feature Flags for SvelteKit</title>
	<meta
		name="description"
		content="Server-side feature flags, percentage rollouts and A/B tests for SvelteKit, built on remote functions."
	/>
</svelte:head>

{#snippet groupSwitch(group: string, member: boolean)}
	<button
		class="switch"
		role="switch"
		aria-checked={member}
		aria-label={group}
		disabled={busy !== null}
		onclick={() => toggleGroup(group)}
	>
		<span class="track"><span class="thumb"></span></span>
		{group}
	</button>
{/snippet}

{#snippet heroControl()}
	<p>The classic hero. Yellow, dependable, the baseline everything is measured against.</p>
{/snippet}

{#snippet heroA()}
	<p>The blue hero. Same words, cooler palette. Does calm convert better?</p>
{/snippet}

{#snippet heroB()}
	<p>The violet hero. The bold option somebody argued for in the design review.</p>
{/snippet}

<svelte:boundary>
	{@const user = await getUserInfo()}
	{@const demo = await getDemoState()}
	{@const flags = await checkFeatures(FLAGS)}
	{@const destinations = await getRouteDestinations()}
	{@const distribution = await getVariantDistribution()}

	{@const variant = flags['ab-test-homepage']?.variant ?? 'control'}
	{@const accent = VARIANT_COLORS[variant] ?? VARIANT_COLORS.control}
	{@const bucket = demo.buckets['gradual-rollout']}

	<div class="page" style:--accent={accent}>
		<header class="bar">
			<a class="brand" href="#top">🐤 <span>Canary</span></a>

			<div class="identity">
				<span class="chip id" title={user.userId} data-testid="user-id">
					<span class="dot"></span>
					{user.userId.slice(0, 13)}…
				</span>
				{#each GROUPS as group (group)}
					{@render groupSwitch(group, user.groups.includes(group))}
				{/each}
				<button class="ghost" disabled={busy !== null} onclick={newIdentity}>
					<span class="dice" class:rolling={busy === 'identity'}>🎲</span> New identity
				</button>
			</div>
		</header>

		<main id="top">
			<!-- Hero -->
			<section class="hero">
				<div class="glow" aria-hidden="true"></div>

				<div class="pitch">
					<p class="eyebrow">Feature flags for SvelteKit</p>
					<h1>Flip features,<br /><em>not deploys.</em></h1>
					<p class="lede">
						Canary resolves every flag on the server, renders the answer into the page, and
						re-evaluates the moment something changes. Everything on this page is live and running
						against <strong>your</strong> visitor ID.
					</p>

					<div class="cta">
						<button class="install" onclick={copyInstall} aria-label="Copy install command">
							<span class="prompt">$</span>
							{snippets.install}
							<span class="copy">{copied ? '✓' : '⧉'}</span>
						</button>
						<a
							class="github"
							href="https://github.com/fairhurt/canary"
							target="_blank"
							rel="noopener"
						>
							GitHub →
						</a>
					</div>

					<p class="aside">
						<span class="swatch"></span>
						<span>
							This page's accent colour is an A/B test. You got <code>{variant}</code>. Roll a new
							identity in the bar above to try your luck again.
						</span>
					</p>
				</div>

				<div class="board" aria-label="Live flag board">
					<div class="board-head">
						<span><span class="pulse"></span> Live flags</span>
						<span class="muted">evaluated on the server</span>
					</div>

					<ul>
						{#each Object.entries(flags) as [key, result] (key)}
							<li data-testid="flag-{key}" data-enabled={result.enabled}>
								{#key result.enabled}
									<span class="state" class:on={result.enabled} in:scale={{ start: 0.5 }}>
										{result.enabled ? 'ON' : 'OFF'}
									</span>
								{/key}
								<div class="flag">
									<code>{key}</code>
									<span class="reason">{result.reason}</span>
								</div>
								{#if result.variant}
									<span class="chip variant">{result.variant}</span>
								{/if}
							</li>
						{/each}
					</ul>

					<p class="board-foot">
						Flip the <strong>beta</strong> and <strong>internal</strong> switches in the bar and watch
						this change. No reload, one request.
					</p>
				</div>
			</section>

			<!-- Basic -->
			<section id="basic">
				<p class="eyebrow">01 · The basics</p>
				<h2>Wrap it. Ship it.</h2>
				<p class="intro">
					A flag is one component. The decision is made on the server and rendered into the HTML, so
					there is no loading spinner and no flash of the wrong thing.
				</p>

				<div class="split">
					<div class="stage">
						<Feature flag="new-dashboard">
							<div class="card on">
								<span class="tag">new-dashboard</span>
								<h3>✨ New Dashboard Enabled</h3>
								<p>
									This card came down in the server-rendered HTML. View source and you'll find it.
								</p>
							</div>

							{#snippet fallback()}
								<div class="card">
									<span class="tag">new-dashboard</span>
									<h3>Classic Dashboard</h3>
									<p>The new dashboard is not available yet.</p>
								</div>
							{/snippet}
						</Feature>
					</div>

					<Code title="+page.svelte" code={snippets.basic} />
				</div>
			</section>

			<!-- Rollout -->
			<section id="rollout">
				<p class="eyebrow">02 · Percentage rollouts</p>
				<h2>Start at 1%. Sleep at night.</h2>
				<p class="intro">
					Your visitor ID is hashed with the flag's name into a bucket between 0 and 100. You are in
					as soon as the rollout passes your bucket, and you stay in as it grows.
				</p>

				<div class="split">
					<div class="stage">
						<div class="playground">
							<div class="grid" class:in={bucket < rollout} aria-hidden="true">
								{#each cells as i (i)}
									<span class:lit={i < rollout} class:you={i === Math.floor(bucket)}></span>
								{/each}
							</div>

							<label class="slider">
								<span>
									Simulated rollout
									<output>{rollout}%</output>
								</span>
								<input type="range" min="0" max="100" bind:value={rollout} />
							</label>

							<p class="verdict" data-testid="rollout-verdict">
								You are in bucket <strong>{bucket.toFixed(1)}</strong>, so at {rollout}% you would
								be
								{#key bucket < rollout}
									<strong class="state" class:on={bucket < rollout} in:scale={{ start: 0.5 }}>
										{bucket < rollout ? 'IN' : 'OUT'}
									</strong>
								{/key}
							</p>
						</div>

						<Feature flag="gradual-rollout">
							<div class="card on">
								<span class="tag">gradual-rollout · really set to 50%</span>
								<h3>🎲 You're in the rollout</h3>
								<p>The server put you in the half of visitors who get this feature.</p>
							</div>

							{#snippet fallback()}
								<div class="card">
									<span class="tag">gradual-rollout · really set to 50%</span>
									<h3>⏳ Not rolled out to you yet</h3>
									<p>The server put you in the half of visitors who are still waiting.</p>
								</div>
							{/snippet}
						</Feature>
					</div>

					<Code title="features.config.json" code={snippets.rollout} />
				</div>
			</section>

			<!-- Groups -->
			<section id="groups">
				<p class="eyebrow">03 · User groups</p>
				<h2>Let the right people in early.</h2>
				<p class="intro">
					List <code>userGroups</code> on a flag and only those groups get it, even while it is switched
					off for everyone else. Perfect for a beta programme, or for testing in production before launch.
				</p>

				<div class="split">
					<div class="stage">
						<Feature flag="beta-checkout">
							<div class="card on" in:fly={{ y: 12 }}>
								<span class="tag">beta-checkout</span>
								<h3>🎉 Beta Checkout Unlocked</h3>
								<p>You're in. One-click purchase is all yours.</p>
								<button class="ghost" disabled={busy !== null} onclick={() => toggleGroup('beta')}>
									{user.groups.includes('beta') ? 'Leave beta' : 'Unlocked by internal'}
								</button>
							</div>

							{#snippet fallback()}
								<div class="card locked" in:fly={{ y: 12 }}>
									<span class="tag">beta-checkout</span>
									<h3>🔒 Beta Checkout Locked</h3>
									<p>Only the beta and internal groups get the new checkout.</p>
									<button
										class="primary"
										disabled={busy !== null}
										onclick={() => toggleGroup('beta')}
									>
										Join beta
									</button>
								</div>
							{/snippet}
						</Feature>

						<Feature flag="experimental-feature">
							<div class="card on" in:fly={{ y: 12 }}>
								<span class="tag">experimental-feature · enabled: false</span>
								<h3>🧪 Experimental Feature Active</h3>
								<p>Switched off for the world, switched on for you.</p>
								<button
									class="ghost"
									disabled={busy !== null}
									onclick={() => toggleGroup('internal')}
								>
									Leave internal
								</button>
							</div>

							{#snippet fallback()}
								<div class="card locked" in:fly={{ y: 12 }}>
									<span class="tag">experimental-feature · enabled: false</span>
									<h3>🔒 Experimental Feature</h3>
									<p>Disabled globally. The internal group can still get in.</p>
									<button
										class="primary"
										disabled={busy !== null}
										onclick={() => toggleGroup('internal')}
									>
										Join internal
									</button>
								</div>
							{/snippet}
						</Feature>
					</div>

					<div class="stack">
						<Code title="features.config.json" code={snippets.groups} />
						<Code title="anywhere in your app" code={snippets.joinGroup} />
					</div>
				</div>
			</section>

			<!-- A/B -->
			<section id="ab">
				<p class="eyebrow">04 · A/B testing</p>
				<h2>Same visitor, same variant. Always.</h2>
				<p class="intro">
					Variants are assigned by hashing, not by rolling dice on each request, so nobody sees the
					page change under them. The split below is {distribution.length} variants across 3,000 simulated
					visitors.
				</p>

				<div class="split">
					<div class="stage">
						<div class="variants">
							{#each distribution as { variant: name, share } (name)}
								<div
									class="variant-tile"
									class:mine={name === variant}
									style:--tile={VARIANT_COLORS[name]}
									data-testid="variant-{name}"
								>
									<span class="tile-name">{name}</span>
									<span class="tile-share">{(share * 100).toFixed(1)}%</span>
									<span class="tile-bar"><span style:width="{share * 100}%"></span></span>
									{#if name === variant}
										<span class="you-badge" in:scale>you</span>
									{/if}
								</div>
							{/each}
						</div>

						<div class="card on">
							<span class="tag">ab-test-homepage · {variant}</span>
							<Feature
								flag="ab-test-homepage"
								variants={{ control: heroControl, 'variant-a': heroA, 'variant-b': heroB }}
							/>
						</div>
					</div>

					<Code title="+page.svelte" code={snippets.variants} />
				</div>
			</section>

			<!-- Routes -->
			<section id="routes">
				<p class="eyebrow">05 · Route redirects</p>
				<h2>Send people to the right version.</h2>
				<p class="intro">
					One server hook redirects requests before a page ever renders. This is where each route
					would send you right now. Change your groups and the destinations change with them.
				</p>

				<div class="split">
					<div class="stage">
						<!-- Plain links with a full page load: the redirects happen on the server -->
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<ul class="routes">
							{#each destinations as { path, destination } (path)}
								<li data-testid="route-{path}">
									<a href={path} data-sveltekit-reload><code>{path}</code></a>
									<span class="arrow" aria-hidden="true">→</span>
									{#key destination}
										<code class="dest" class:moved={destination} in:fly={{ x: -8 }}>
											{destination ?? 'stays put'}
										</code>
									{/key}
								</li>
							{/each}
						</ul>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
						<p class="hint">Click a route to try it for real.</p>
					</div>

					<Code title="features.config.json" code={snippets.routes} />
				</div>
			</section>

			<!-- Quick start -->
			<section id="start" class="start">
				<p class="eyebrow">Get started</p>
				<h2>Three steps. Then go flip something.</h2>

				<ol>
					<li>
						<h3>Install</h3>
						<Code title="terminal" code={snippets.install} />
					</li>
					<li>
						<h3>Describe your flags</h3>
						<Code title="src/features.config.json" code={snippets.rollout} />
					</li>
					<li>
						<h3>Add the hook</h3>
						<Code title="src/hooks.server.ts" code={snippets.hooks} />
					</li>
				</ol>

				<p class="outro">
					<a href="https://github.com/fairhurt/canary" target="_blank" rel="noopener">
						Read the docs on GitHub →
					</a>
				</p>
			</section>
		</main>

		<footer>🐤 Canary · MIT licensed · built with SvelteKit remote functions</footer>
	</div>
</svelte:boundary>

<!-- Debug panel -->
<FeatureDebug position="bottom-right" />

<style>
	.page {
		min-height: 100vh;
		/* The hero glow is wider than the page */
		overflow-x: clip;
	}

	.page :global(a) {
		color: var(--accent);
	}

	main {
		max-width: 1120px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	section {
		padding: 5rem 0;
		border-top: 1px solid var(--border);
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

	h2 {
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		line-height: 1.15;
		letter-spacing: -0.02em;
	}

	.eyebrow {
		margin-bottom: 0.75rem;
		font-family: var(--mono);
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
		transition: color 0.4s;
	}

	.intro {
		max-width: 44rem;
		margin: 1rem 0 2.5rem;
		font-size: 1.1rem;
		color: var(--muted);
	}

	.muted {
		color: var(--muted);
	}

	/* Sticky identity bar */
	.bar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--bg) 80%, transparent);
		backdrop-filter: blur(12px);
	}

	.brand {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text) !important;
		text-decoration: none !important;
	}

	.identity {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--muted);
		white-space: nowrap;
	}

	.dot,
	.pulse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--on);
	}

	.pulse {
		display: inline-block;
		margin-right: 0.35rem;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--on) 60%, transparent);
		}
		100% {
			box-shadow: 0 0 0 0.6rem transparent;
		}
	}

	button {
		font: inherit;
		cursor: pointer;
	}

	button:disabled {
		cursor: progress;
	}

	.switch {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.7rem 0.25rem 0.3rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font-family: var(--mono);
		font-size: 0.8rem;
		transition:
			color 0.2s,
			border-color 0.2s;
	}

	.switch[aria-checked='true'] {
		color: var(--text);
		border-color: var(--accent);
	}

	.track {
		display: inline-flex;
		width: 2rem;
		height: 1.15rem;
		padding: 0.15rem;
		border-radius: 999px;
		background: var(--border);
		transition: background 0.2s;
	}

	.thumb {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		background: var(--muted);
		transition:
			transform 0.2s cubic-bezier(0.3, 1.6, 0.6, 1),
			background 0.2s;
	}

	.switch[aria-checked='true'] .track {
		background: var(--accent);
	}

	.switch[aria-checked='true'] .thumb {
		transform: translateX(0.85rem);
		background: var(--bg);
	}

	.ghost,
	.primary {
		padding: 0.35rem 0.8rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		transition:
			border-color 0.2s,
			transform 0.1s;
	}

	.ghost {
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text);
	}

	.ghost:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.primary {
		border: 1px solid var(--accent);
		background: var(--accent);
		color: var(--bg);
		font-weight: 600;
	}

	.primary:active:not(:disabled),
	.ghost:active:not(:disabled) {
		transform: scale(0.97);
	}

	.dice {
		display: inline-block;
	}

	.dice.rolling {
		animation: roll 0.5s linear infinite;
	}

	@keyframes roll {
		to {
			transform: rotate(360deg);
		}
	}

	/* Hero */
	.hero {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: 3rem;
		align-items: center;
		padding: 5rem 0 6rem;
		border-top: none;
	}

	.glow {
		position: absolute;
		inset: -6rem -20% auto;
		height: 34rem;
		background:
			radial-gradient(
				40% 50% at 25% 40%,
				color-mix(in srgb, var(--accent) 22%, transparent),
				transparent
			),
			radial-gradient(35% 45% at 80% 30%, rgb(96 165 250 / 0.12), transparent);
		filter: blur(20px);
		pointer-events: none;
		animation: drift 14s ease-in-out infinite alternate;
		z-index: -1;
	}

	@keyframes drift {
		to {
			transform: translate3d(4%, 6%, 0) scale(1.08);
		}
	}

	h1 {
		font-size: clamp(2.75rem, 7vw, 4.75rem);
		line-height: 1;
		letter-spacing: -0.04em;
	}

	h1 em {
		font-style: normal;
		color: var(--accent);
		transition: color 0.4s;
	}

	.lede {
		max-width: 34rem;
		margin-top: 1.5rem;
		font-size: 1.15rem;
		color: var(--muted);
	}

	.lede strong {
		color: var(--text);
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.install {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		color: var(--text);
		font-family: var(--mono);
		font-size: 0.9rem;
		transition: border-color 0.2s;
	}

	.install:hover {
		border-color: var(--accent);
	}

	.prompt,
	.copy {
		color: var(--accent);
	}

	.github {
		font-weight: 600;
	}

	.aside {
		display: flex;
		gap: 0.6rem;
		max-width: 34rem;
		margin-top: 2rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.swatch {
		flex: none;
		width: 0.8rem;
		height: 0.8rem;
		margin-top: 0.3rem;
		border-radius: 0.2rem;
		background: var(--accent);
		transition: background 0.4s;
	}

	/* Live flag board */
	.board {
		border: 1px solid var(--border);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--surface) 85%, transparent);
		box-shadow: 0 30px 80px -30px rgb(0 0 0 / 0.8);
		overflow: hidden;
	}

	.board-head {
		display: flex;
		justify-content: space-between;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--border);
		font-family: var(--mono);
		font-size: 0.75rem;
	}

	.board ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.board li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.flag {
		display: flex;
		flex-direction: column;
		min-width: 0;
		margin-right: auto;
	}

	.flag code {
		font-size: 0.85rem;
	}

	.reason {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.state {
		flex: none;
		display: inline-block;
		min-width: 2.6rem;
		padding: 0.1rem 0.4rem;
		border-radius: 0.35rem;
		background: var(--surface-2);
		color: var(--off);
		font-family: var(--mono);
		font-size: 0.7rem;
		font-weight: 700;
		text-align: center;
	}

	.state.on {
		background: color-mix(in srgb, var(--on) 18%, transparent);
		color: var(--on);
	}

	.chip.variant {
		border-color: var(--accent);
		color: var(--accent);
	}

	.board-foot {
		padding: 0.8rem 1rem;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.board-foot strong {
		color: var(--text);
	}

	/* Example layout */
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}

	.stage,
	.stack {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	.card {
		display: grid;
		gap: 0.5rem;
		justify-items: start;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		background: var(--surface);
	}

	.card.on {
		border-color: color-mix(in srgb, var(--on) 45%, var(--border));
		background: linear-gradient(
			160deg,
			color-mix(in srgb, var(--on) 9%, var(--surface)),
			var(--surface) 60%
		);
	}

	.card.locked {
		border-style: dashed;
	}

	.card h3 {
		font-size: 1.15rem;
	}

	.card p {
		color: var(--muted);
	}

	.tag {
		font-family: var(--mono);
		font-size: 0.7rem;
		color: var(--muted);
	}

	/* Rollout playground */
	.playground {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		background: var(--surface);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(20, 1fr);
		gap: 4px;
	}

	.grid span {
		aspect-ratio: 1;
		border-radius: 3px;
		background: var(--border);
		transition: background 0.15s;
	}

	.grid span.lit {
		background: color-mix(in srgb, var(--accent) 70%, var(--border));
	}

	.grid span.you {
		background: var(--text);
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 4px var(--off);
		animation: beacon 1.6s ease-in-out infinite;
	}

	.grid.in span.you {
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 4px var(--on);
	}

	@keyframes beacon {
		50% {
			transform: scale(1.35);
		}
	}

	.slider {
		display: grid;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.slider span {
		display: flex;
		justify-content: space-between;
	}

	.slider output {
		font-family: var(--mono);
		color: var(--text);
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}

	.verdict {
		font-size: 0.95rem;
		color: var(--muted);
	}

	.verdict strong {
		color: var(--text);
	}

	/* Variants */
	.variants {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.variant-tile {
		position: relative;
		display: grid;
		gap: 0.3rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		background: var(--surface);
		opacity: 0.55;
		transition:
			opacity 0.3s,
			border-color 0.3s,
			transform 0.3s;
	}

	.variant-tile.mine {
		opacity: 1;
		border-color: var(--tile);
		transform: translateY(-4px);
		box-shadow: 0 12px 30px -12px var(--tile);
	}

	.tile-name {
		font-family: var(--mono);
		font-size: 0.8rem;
		color: var(--tile);
	}

	.tile-share {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.tile-bar {
		height: 4px;
		border-radius: 2px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.tile-bar span {
		display: block;
		height: 100%;
		background: var(--tile);
	}

	.you-badge {
		position: absolute;
		top: -0.6rem;
		right: 0.75rem;
		padding: 0.05rem 0.5rem;
		border-radius: 999px;
		background: var(--tile);
		color: var(--bg);
		font-family: var(--mono);
		font-size: 0.7rem;
		font-weight: 700;
	}

	/* Routes */
	.routes {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		background: var(--surface);
		overflow: hidden;
	}

	.routes li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.routes li:last-child {
		border-bottom: none;
	}

	.routes a {
		flex: 0 0 9rem;
	}

	.arrow {
		color: var(--muted);
	}

	.dest {
		color: var(--muted);
	}

	.dest.moved {
		color: var(--on);
	}

	.hint {
		font-size: 0.85rem;
		color: var(--muted);
	}

	/* Quick start */
	.start ol {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.25rem;
		margin: 2.5rem 0 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}

	.start li {
		display: grid;
		gap: 0.75rem;
		align-content: start;
		min-width: 0;
		counter-increment: step;
	}

	.start h3::before {
		content: counter(step);
		display: inline-grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		margin-right: 0.6rem;
		border-radius: 50%;
		background: var(--accent);
		color: var(--bg);
		font-size: 0.8rem;
	}

	.outro {
		margin-top: 2.5rem;
		font-size: 1.1rem;
		font-weight: 600;
	}

	footer {
		padding: 2rem 1.5rem 5rem;
		border-top: 1px solid var(--border);
		text-align: center;
		font-size: 0.85rem;
		color: var(--muted);
	}

	@media (max-width: 860px) {
		.hero,
		.split,
		.start ol {
			grid-template-columns: minmax(0, 1fr);
		}

		.hero {
			padding: 3rem 0 4rem;
		}

		section {
			padding: 3.5rem 0;
		}

		.grid {
			grid-template-columns: repeat(10, 1fr);
		}

		.id {
			display: none;
		}
	}
</style>
