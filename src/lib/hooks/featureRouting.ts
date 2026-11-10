/**
 * Server hook that keeps the visitor's identity stable and handles
 * feature-based route redirects. Add this to your hooks.server.ts file
 */

import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { loadConfig, getFeature } from '../utils/configLoader.js';
import { ensureUserId, getUserContext, isUserInGroup } from '../utils/userContext.js';
import { evaluateFeature } from '../utils/evaluate.js';

/** Keys of a route definition that are options rather than group names */
const RESERVED_ROUTE_KEYS = new Set(['feature', 'requiresGroup', 'enabled', 'disabled']);

function normalizePath(pathname: string): string {
	return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Handle feature-based route redirects
 *
 * This hook also persists the visitor's user ID cookie on their first request.
 * Without it, visitors who have never joined a group get a new ID (and so a new
 * rollout bucket and A/B variant) on every request.
 *
 * @example
 * ```ts
 * import { sequence } from '@sveltejs/kit/hooks';
 * import { handleFeatureRouting } from 'sveltekit-canary';
 *
 * export const handle = sequence(handleFeatureRouting);
 * ```
 */
export const handleFeatureRouting: Handle = async ({ event, resolve }) => {
	ensureUserId(event);

	const config = await loadConfig();
	const routes = config.routes;
	const currentPath = normalizePath(event.url.pathname);

	// Check if current route has feature flag routing configured
	const routeDef = routes && Object.hasOwn(routes, currentPath) ? routes[currentPath] : undefined;

	if (routeDef) {
		const userContext = getUserContext(event);

		const redirectTo = (target: string | undefined) => {
			if (target && normalizePath(target) !== currentPath) {
				redirect(307, target);
			}
		};

		// Check if route requires a specific user group
		if (routeDef.requiresGroup && !isUserInGroup(userContext, routeDef.requiresGroup)) {
			// Send non-members to the `disabled` route if there is one, otherwise home
			redirectTo(routeDef.disabled ?? '/');
		}

		// Check if route has feature flag-based routing
		if (routeDef.feature) {
			const { enabled } = evaluateFeature(
				routeDef.feature,
				getFeature(config, routeDef.feature),
				userContext
			);

			redirectTo(enabled ? routeDef.enabled : routeDef.disabled);
		}

		// Check for user group-specific routes (e.g. `"beta": "/checkout-beta"`)
		for (const group of userContext.groups) {
			if (!RESERVED_ROUTE_KEYS.has(group) && Object.hasOwn(routeDef, group)) {
				redirectTo(routeDef[group]);
			}
		}
	}

	return resolve(event);
};
