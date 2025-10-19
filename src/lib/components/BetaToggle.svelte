<script lang="ts">
	import { getUserInfo, joinGroup, leaveGroup } from '../features.remote.js';

	interface Props {
		/** The group name (e.g., 'beta', 'internal') */
		group: string;
		/** Optional label override */
		label?: string;
		/** Custom CSS class */
		class?: string;
	}

	let { group, label, class: className = '' }: Props = $props();

	// Get user context - this will be refreshed by the command functions
	const userInfo = getUserInfo();

	let isLoading = $state(false);

	async function toggleGroup() {
		isLoading = true;
		try {
			const currentInfo = await userInfo;
			if (currentInfo.groups.includes(group)) {
				await leaveGroup(group);
			} else {
				await joinGroup(group);
			}
			// The command functions automatically refresh getUserInfo query
		} catch (error) {
			console.error('Failed to toggle group:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

{#await userInfo}
	<button disabled class={className}>
		Loading...
	</button>
{:then info}
	<button onclick={toggleGroup} disabled={isLoading} class={className}>
		{#if isLoading}
			...
		{:else if info.groups.includes(group)}
			✓ {label || `Leave ${group}`}
		{:else}
			{label || `Join ${group}`}
		{/if}
	</button>
{:catch error}
	<button disabled class={className}>
		Error loading status
	</button>
{/await}

<style>
	button {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
		background: white;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	button:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #999;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
