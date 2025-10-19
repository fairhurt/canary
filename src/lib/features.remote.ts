/**
 * Remote functions for feature flag operations
 * These run on the server but can be called from anywhere in the app
 */

import * as v from 'valibot';
import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import type { FeatureCheckResult } from './types/index.js';
import { getFeatureConfig } from './utils/configLoader.js';
import {
	getUserContext,
	addUserToGroup,
	removeUserFromGroup,
	ensureUserId
} from './utils/userContext.js';
import { assignVariant, isInRollout } from './utils/hash.js';

/**
 * Check if a feature is enabled for the current user
 * Returns the enabled status and assigned variant (if applicable)
 */
export const checkFeature = query(v.string(), async (featureKey): Promise<FeatureCheckResult> => {
	const event = getRequestEvent();
	const userContext = getUserContext(event);
	const featureDef = await getFeatureConfig(featureKey);

	// Feature doesn't exist
	if (!featureDef) {
		return {
			enabled: false,
			reason: 'Feature not found'
		};
	}

	// Feature is globally disabled
	if (!featureDef.enabled) {
		return {
			enabled: false,
			reason: 'Feature is globally disabled'
		};
	}

	// Check user group requirements
	if (featureDef.userGroups && featureDef.userGroups.length > 0) {
		const hasRequiredGroup = featureDef.userGroups.some((group) =>
			userContext.groups.includes(group)
		);

		if (!hasRequiredGroup) {
			return {
				enabled: false,
				reason: 'User not in required group'
			};
		}
	}

	// Check rollout percentage
	const rollout = featureDef.rollout ?? 100;
	if (!isInRollout(userContext.userId, featureKey, rollout)) {
		return {
			enabled: false,
			reason: 'User not in rollout percentage'
		};
	}

	// Handle A/B test variants
	if (featureDef.variants && featureDef.variants.length > 0) {
		// Check if user already has a persisted variant assignment
		let variant = userContext.variants[featureKey];

		// If not, calculate one deterministically (don't persist in query)
		if (!variant) {
			const calculatedVariant = assignVariant(
				userContext.userId,
				featureKey,
				featureDef.variants,
				rollout
			);
			variant = calculatedVariant || featureDef.defaultVariant || featureDef.variants[0];
		}

		return {
			enabled: true,
			variant,
			reason: 'Feature enabled with variant'
		};
	}

	// Feature is enabled, no variants
	return {
		enabled: true,
		reason: 'Feature enabled'
	};
});

/**
 * Get the current user's context (ID, groups, variants)
 */
export const getUserInfo = query(async () => {
	const event = getRequestEvent();
	return getUserContext(event);
});

/**
 * Add the current user to a beta/test group
 */
export const joinGroup = command(v.string(), async (group) => {
	const event = getRequestEvent();
	
	// Ensure user ID is persisted
	ensureUserId(event);
	
	const context = addUserToGroup(event, group);

	return {
		success: true,
		groups: context.groups
	};
});

/**
 * Remove the current user from a beta/test group
 */
export const leaveGroup = command(v.string(), async (group) => {
	const event = getRequestEvent();
	
	// Ensure user ID is persisted
	ensureUserId(event);
	
	const context = removeUserFromGroup(event, group);

	return {
		success: true,
		groups: context.groups
	};
});

/**
 * Check multiple features at once (batch query)
 * More efficient than calling checkFeature multiple times
 */
export const checkFeatures = query(v.array(v.string()), async (featureKeys) => {
	const results: Record<string, FeatureCheckResult> = {};

	for (const key of featureKeys) {
		// Note: In a real implementation, you'd want to optimize this
		// to avoid calling checkFeature which does event lookups multiple times
		const event = getRequestEvent();
		const userContext = getUserContext(event);
		const featureDef = await getFeatureConfig(key);

		if (!featureDef || !featureDef.enabled) {
			results[key] = {
				enabled: false,
				reason: !featureDef ? 'Feature not found' : 'Feature is globally disabled'
			};
			continue;
		}

		// Simplified check - you could extract this logic to a shared function
		if (featureDef.userGroups && featureDef.userGroups.length > 0) {
			const hasRequiredGroup = featureDef.userGroups.some((group) =>
				userContext.groups.includes(group)
			);

			if (!hasRequiredGroup) {
				results[key] = {
					enabled: false,
					reason: 'User not in required group'
				};
				continue;
			}
		}

		const rollout = featureDef.rollout ?? 100;
		if (!isInRollout(userContext.userId, key, rollout)) {
			results[key] = {
				enabled: false,
				reason: 'User not in rollout percentage'
			};
			continue;
		}

		results[key] = {
			enabled: true,
			variant: userContext.variants[key],
			reason: 'Feature enabled'
		};
	}

	return results;
});
