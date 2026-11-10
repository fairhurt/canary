import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';
import { initCanary, handleFeatureRouting } from './lib/index.js';
import config from './features.config.json' with { type: 'json' };

// Initialize Canary once at startup with the demo's static config
initCanary({ config });

// Combine hooks
export const handle: Handle = sequence(handleFeatureRouting);
