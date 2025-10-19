<script lang="ts">
	import { getUserInfo } from '../features.remote.js';

	interface Props {
		/** Position of the debug panel */
		position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
		/** Initially expanded or collapsed */
		expanded?: boolean;
	}

	let { position = 'bottom-right', expanded = false }: Props = $props();

	let isExpanded = $state(expanded);
	const userInfo = getUserInfo();

	// Load config client-side isn't possible with our current setup
	// We'll just show user info for now
	// In a real implementation, you might want a separate remote function to get config

	const positionClass = $derived(
		position === 'bottom-right'
			? 'bottom-2 right-2'
			: position === 'bottom-left'
				? 'bottom-2 left-2'
				: position === 'top-right'
					? 'top-2 right-2'
					: 'top-2 left-2'
	);
</script>

<div class="debug-panel {positionClass}" class:expanded={isExpanded}>
	<button class="toggle" onclick={() => (isExpanded = !isExpanded)}>
		{isExpanded ? '✕' : '🚩'} Canary Debug
	</button>

	{#if isExpanded}
		<div class="content">
			<h3>User Context</h3>
			{#await userInfo}
				<p>Loading...</p>
			{:then info}
				<dl>
					<dt>User ID:</dt>
					<dd><code>{info.userId}</code></dd>

					<dt>Groups:</dt>
					<dd>
						{#if info.groups.length > 0}
							{#each info.groups as group (group)}
								<span class="badge">{group}</span>
							{/each}
						{:else}
							<em>None</em>
						{/if}
					</dd>

					<dt>Variants:</dt>
					<dd>
						{#if Object.keys(info.variants).length > 0}
							<ul>
								{#each Object.entries(info.variants) as [feature, variant] (feature)}
									<li><strong>{feature}:</strong> {variant}</li>
								{/each}
							</ul>
						{:else}
							<em>None assigned</em>
						{/if}
					</dd>
				</dl>
			{:catch error}
				<p class="error">Error: {error.message}</p>
			{/await}

			<div class="actions">
				<button onclick={() => userInfo.refresh()}>Refresh</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.debug-panel {
		position: fixed;
		z-index: 9999;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 0.875rem;
	}

	.debug-panel:not(.expanded) {
		width: auto;
	}

	.debug-panel.expanded {
		width: 320px;
		max-height: 80vh;
		overflow: auto;
		background: white;
		border: 2px solid #333;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.toggle {
		padding: 0.5rem 1rem;
		background: #333;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 600;
		width: 100%;
		text-align: left;
	}

	.toggle:hover {
		background: #000;
	}

	.content {
		padding: 1rem;
	}

	h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		border-bottom: 2px solid #eee;
		padding-bottom: 0.5rem;
	}

	dl {
		margin: 0;
	}

	dt {
		font-weight: 600;
		margin-top: 0.75rem;
		margin-bottom: 0.25rem;
	}

	dd {
		margin: 0;
		margin-bottom: 0.75rem;
	}

	code {
		background: #f5f5f5;
		padding: 0.125rem 0.25rem;
		border-radius: 0.125rem;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
	}

	.badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		background: #007bff;
		color: white;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		margin-right: 0.25rem;
		margin-bottom: 0.25rem;
	}

	ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	li {
		margin-bottom: 0.25rem;
	}

	.error {
		color: #dc3545;
	}

	.actions {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #eee;
	}

	.actions button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.actions button:hover {
		background: #0056b3;
	}
</style>
