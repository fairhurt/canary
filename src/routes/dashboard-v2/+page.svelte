<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>New Dashboard - Canary Demo</title>
</svelte:head>

<main>
	<h1>New Dashboard</h1>
	<p>
		You were redirected here from <code>/dashboard</code> because <code>new-dashboard</code> is enabled
		for you.
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
