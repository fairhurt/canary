import { initCanary, handleFeatureRouting } from './lib/index.js';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

// Initialize Canary with default config
initCanary({
	debug: true
});

// Combine hooks
export const handle: Handle = sequence(handleFeatureRouting);
