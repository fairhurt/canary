<script lang="ts">
	import { checkFeature, getUserInfo } from '../features.remote.js';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Feature flag key to check */
		flag: string;
		/** Children to render if feature is enabled */
		children?: Snippet<[{ variant?: string }]>;
		/** Fallback content if feature is disabled */
		fallback?: Snippet;
		/** Content for specific variants */
		variants?: Record<string, Snippet>;
		/** Loading state snippet */
		loading?: Snippet;
		/** Error state snippet */
		error?: Snippet<[Error]>;
	}

	let { flag, children, fallback, variants, loading, error }: Props = $props();

	// Get user info to create a reactive dependency on group changes
	const userInfo = getUserInfo();
	
	// Check the feature - will re-run when userInfo changes
	const featureCheck = $derived.by(async () => {
		// Wait for userInfo to ensure we have the latest group membership
		await userInfo;
		return checkFeature(flag);
	});
</script>

{#await featureCheck}
	{#if loading}
		{@render loading()}
	{/if}
{:then result}
	{#if result.enabled}
		{#if variants && result.variant && variants[result.variant]}
			{@render variants[result.variant]()}
		{:else if children}
			{@render children({ variant: result.variant })}
		{/if}
	{:else if fallback}
		{@render fallback()}
	{/if}
{:catch err}
	{#if error}
		{@render error(err)}
	{/if}
{/await}
