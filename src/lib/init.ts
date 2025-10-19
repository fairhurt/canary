/**
 * Initialization utilities for Canary feature flags
 */

import type { FeatureFlagsOptions } from './types/index.js';
import { initConfigLoader } from './utils/configLoader.js';
import { initCookieNames } from './utils/userContext.js';

/**
 * Initialize the Canary feature flags library
 * Call this once in your hooks.server.ts or app startup
 *
 * @example
 * ```ts
 * import { initCanary } from 'canary';
 *
 * // With static JSON config (default)
 * initCanary();
 *
 * // With custom config provider
 * initCanary({
 *   configProvider: async () => {
 *     const res = await fetch('https://api.example.com/features');
 *     return await res.json();
 *   },
 *   cacheTTL: 60 // Cache for 60 seconds
 * });
 * ```
 */
export function initCanary(options?: FeatureFlagsOptions): void {
	// Set default options
	const defaultOptions = {
		debug: false,
		userIdCookie: 'canary_user_id',
		groupsCookie: 'canary_groups',
		variantsCookie: 'canary_variants',
		cacheTTL: 300,
		...options
	};

	// Initialize config loader
	initConfigLoader(defaultOptions);

	// Initialize cookie names
	initCookieNames({
		userIdCookie: defaultOptions.userIdCookie,
		groupsCookie: defaultOptions.groupsCookie,
		variantsCookie: defaultOptions.variantsCookie
	});

	if (defaultOptions.debug) {
		console.log('[Canary] Initialized with options:', defaultOptions);
	}
}

/**
 * Type-safe feature flags configuration
 * Use this to define your feature flags with TypeScript autocomplete
 *
 * @example
 * ```ts
 * import { defineConfig } from 'canary';
 *
 * export default defineConfig({
 *   features: {
 *     'new-dashboard': {
 *       enabled: true,
 *       rollout: 100
 *     }
 *   }
 * });
 * ```
 */
export function defineConfig<T extends import('./types/index.js').FeatureFlagsConfig>(config: T): T {
	return config;
}
