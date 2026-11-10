<script lang="ts">
	interface Props {
		/** Shown in the header, e.g. a file name */
		title: string;
		code: string;
	}

	let { title, code }: Props = $props();

	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard access can be denied; the code is still selectable
		}
	}
</script>

<figure class="code">
	<figcaption>
		<span>{title}</span>
		<button onclick={copy} aria-label="Copy {title}">{copied ? 'Copied ✓' : 'Copy'}</button>
	</figcaption>
	<pre><code>{code}</code></pre>
</figure>

<style>
	.code {
		margin: 0;
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: #0d0d14;
		overflow: hidden;
	}

	figcaption {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--muted);
	}

	button {
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		background: transparent;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}

	button:hover {
		color: var(--text);
		border-color: var(--muted);
	}

	pre {
		margin: 0;
		padding: 1rem;
		overflow-x: auto;
		font-size: 0.8rem;
		line-height: 1.65;
		tab-size: 2;
	}

	code {
		color: #d6d6e4;
	}
</style>
