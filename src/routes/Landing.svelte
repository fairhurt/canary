<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	interface Props {
		icon: string;
		title: string;
		/** The route from the demo config that leads here */
		route: string;
		children: Snippet;
	}

	let { icon, title, route, children }: Props = $props();
</script>

<svelte:head>
	<title>{title} - Canary Demo</title>
</svelte:head>

<main>
	<div class="card">
		<p class="trail">
			<code>{route}</code>
			{#if page.url.pathname !== route}
				<span aria-hidden="true">→</span>
				<code class="here">{page.url.pathname}</code>
			{/if}
		</p>
		<span class="icon" aria-hidden="true">{icon}</span>
		<h1>{title}</h1>
		<p>{@render children()}</p>
		<a href="{resolve('/')}#routes">← Back to the demo</a>
	</div>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		min-height: 100vh;
		padding: 1.5rem;
	}

	.card {
		display: grid;
		gap: 0.75rem;
		justify-items: start;
		max-width: 32rem;
		padding: 2rem;
		border: 1px solid var(--border);
		border-radius: 1rem;
		background: var(--surface);
	}

	.trail {
		display: flex;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.here {
		color: var(--on);
	}

	.icon {
		font-size: 2.5rem;
		line-height: 1;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		letter-spacing: -0.02em;
	}

	p {
		margin: 0;
		color: var(--muted);
	}
</style>
