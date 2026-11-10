<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Checkout - Canary Demo</title>
</svelte:head>

<main>
	<h1>Checkout</h1>
	<p>This is the standard checkout. Beta members are redirected to <code>/checkout-beta</code>.</p>
	<p><a href={resolve('/')}>← Back to the demo</a></p>
</main>

<style>
	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}
</style>
