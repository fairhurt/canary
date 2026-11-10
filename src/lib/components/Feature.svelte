<script lang="ts">
	import { checkFeature } from '../features.remote.js';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Feature flag key to check */
		flag: string;
		/** Children to render if feature is enabled */
		children?: Snippet<[{ variant?: string }]>;
		/** Fallback content if feature is disabled */
		fallback?: Snippet;
		/** Content for specific variants (takes precedence over `children`) */
		variants?: Record<string, Snippet>;
		/**
		 * Loading state snippet. When provided, the feature is resolved in the
		 * browser and this snippet is shown (and server-rendered) in the meantime.
		 * Without it, the resolved content is server-rendered directly
		 */
		loading?: Snippet;
		/** Error state snippet */
		error?: Snippet<[unknown]>;
	}

	let { flag, children, fallback, variants, loading, error }: Props = $props();
</script>

<svelte:boundary pending={loading}>
	{@const result = await checkFeature(flag)}

	{#if result.enabled}
		{#if variants && result.variant && Object.hasOwn(variants, result.variant)}
			{@render variants[result.variant]()}
		{:else if children}
			{@render children({ variant: result.variant })}
		{/if}
	{:else if fallback}
		{@render fallback()}
	{/if}

	{#snippet failed(err)}
		{#if error}
			{@render error(err)}
		{/if}
	{/snippet}
</svelte:boundary>
