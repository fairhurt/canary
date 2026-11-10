<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Beta Checkout - Canary Demo</title>
</svelte:head>

<main>
	<h1>Beta Checkout</h1>
	<p>
		Only members of the beta group can see this page. Everyone else is sent to <code>/checkout</code
		>.
	</p>
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
