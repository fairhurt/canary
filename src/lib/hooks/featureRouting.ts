/**
 * Server hook for handling feature-based route redirects
 * Add this to your hooks.server.ts file
 */

import { redirect } from '@sveltejs/kit';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { getRouteConfig, getFeatureConfig } from '../utils/configLoader.js';
import { getUserContext, isUserInGroup } from '../utils/userContext.js';
import { isInRollout } from '../utils/hash.js';

/**
 * Check if a feature is enabled for the user (simplified version for hooks)
 */
async function isFeatureEnabled(
	event: RequestEvent,
	featureKey: string
): Promise<boolean> {
	const userContext = getUserContext(event);
	const featureDef = await getFeatureConfig(featureKey);

	if (!featureDef || !featureDef.enabled) {
		return false;
	}

	// Check user group requirements
	if (featureDef.userGroups && featureDef.userGroups.length > 0) {
		const hasRequiredGroup = featureDef.userGroups.some((group) =>
			userContext.groups.includes(group)
		);
		if (!hasRequiredGroup) {
			return false;
		}
	}

	// Check rollout percentage
	const rollout = featureDef.rollout ?? 100;
	if (!isInRollout(userContext.userId, featureKey, rollout)) {
		return false;
	}

	return true;
}

/**
 * Handle feature-based route redirects
 * This hook should be added to your hooks.server.ts sequence
 *
 * @example
 * ```ts
 * import { sequence } from '@sveltejs/kit/hooks';
 * import { handleFeatureRouting } from 'canary/hooks';
 *
 * export const handle = sequence(handleFeatureRouting);
 * ```
 */
export const handleFeatureRouting: Handle = async ({ event, resolve }) => {
	const routeConfig = await getRouteConfig();
	const currentPath = event.url.pathname;

	// Check if current route has feature flag routing configured
	const routeDef = routeConfig[currentPath];

	if (routeDef) {
		const userContext = getUserContext(event);

		// Check if route requires a specific user group
		if (routeDef.requiresGroup) {
			if (!isUserInGroup(userContext, routeDef.requiresGroup)) {
				// User doesn't have required group - check for group-specific redirect
				const groupRedirect = routeDef[routeDef.requiresGroup];
				if (groupRedirect && typeof groupRedirect === 'string') {
					redirect(307, groupRedirect);
				}
				// Or just block access
				redirect(307, '/');
			}

			// User has required group - check for group-specific route
			const groupRoute = routeDef[routeDef.requiresGroup];
			if (groupRoute && typeof groupRoute === 'string' && groupRoute !== currentPath) {
				redirect(307, groupRoute);
			}
		}

		// Check if route has feature flag-based routing
		if (routeDef.feature) {
			const featureEnabled = await isFeatureEnabled(event, routeDef.feature);

			if (featureEnabled && routeDef.enabled && routeDef.enabled !== currentPath) {
				// Feature is enabled, redirect to enabled route
				redirect(307, routeDef.enabled);
			} else if (!featureEnabled && routeDef.disabled && routeDef.disabled !== currentPath) {
				// Feature is disabled, redirect to disabled route
				redirect(307, routeDef.disabled);
			}
		}

		// Check for user group-specific routes (e.g., beta users)
		for (const group of userContext.groups) {
			const groupRoute = routeDef[group];
			if (
				groupRoute &&
				typeof groupRoute === 'string' &&
				groupRoute !== currentPath &&
				group !== 'feature' &&
				group !== 'requiresGroup' &&
				group !== 'enabled' &&
				group !== 'disabled'
			) {
				redirect(307, groupRoute);
			}
		}
	}

	return resolve(event);
};
