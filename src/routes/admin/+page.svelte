<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Admin - Canary Demo</title>
</svelte:head>

<main>
	<h1>Admin</h1>
	<p>Only members of the internal group can see this page. Everyone else is sent home.</p>
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
