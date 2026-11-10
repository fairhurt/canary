<script lang="ts">
	import {
		checkFeature,
		checkFeatures,
		getUserInfo,
		joinGroup,
		leaveGroup
	} from '../features.remote.js';

	interface Props {
		/** The group name (e.g., 'beta', 'internal') */
		group: string;
		/** Optional label override */
		label?: string;
		/** Custom CSS class */
		class?: string;
	}

	let { group, label, class: className = '' }: Props = $props();

	let isLoading = $state(false);

	async function toggleGroup() {
		isLoading = true;
		try {
			const { groups } = await getUserInfo();
			const toggle = groups.includes(group) ? leaveGroup : joinGroup;

			// Refresh the user info and every active feature check in the same round trip
			await toggle(group).updates(getUserInfo, checkFeature, checkFeatures);
		} catch (error) {
			console.error('Failed to toggle group:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:boundary>
	{@const info = await getUserInfo()}
	{@const isMember = info.groups.includes(group)}

	<button onclick={toggleGroup} disabled={isLoading} aria-pressed={isMember} class={className}>
		{#if isLoading}
			...
		{:else if isMember}
			✓ {label || `Leave ${group}`}
		{:else}
			{label || `Join ${group}`}
		{/if}
	</button>

	{#snippet failed()}
		<button disabled class={className}>Error loading status</button>
	{/snippet}
</svelte:boundary>

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
