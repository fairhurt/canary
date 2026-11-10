<script lang="ts">
	let { children } = $props();
</script>

{@render children()}

<style>
	:global(:root) {
		--bg: #0a0a0f;
		--surface: #13131b;
		--surface-2: #1b1b26;
		--border: #2a2a38;
		--text: #f1f1f6;
		--muted: #9d9db0;
		--accent: #ffd60a;
		--on: #3ddc97;
		--off: #6b6b80;
		--mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
		--sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		color-scheme: dark;
	}

	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: 5rem;
	}

	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: var(--sans);
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	:global(a) {
		color: var(--accent);
		text-decoration: none;
	}

	:global(a:hover) {
		text-decoration: underline;
	}

	:global(code) {
		font-family: var(--mono);
		font-size: 0.9em;
	}

	:global(:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}

		:global(*),
		:global(*::before),
		:global(*::after) {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
