/**
 * Remote functions for feature flag operations
 * These run on the server but can be called from anywhere in the app
 */

import * as v from 'valibot';
import { query, command, getRequestEvent, requested } from '$app/server';
import type { FeatureCheckResult } from './types/index.js';
import { loadConfig, getFeature } from './utils/configLoader.js';
import {
	getUserContext,
	addUserToGroup,
	removeUserFromGroup,
	ensureUserId
} from './utils/userContext.js';
import { evaluateFeature } from './utils/evaluate.js';

const featureKeySchema = v.pipe(v.string(), v.maxLength(256));
const groupSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64));

/** Upper bounds on how many active queries a single command will refresh */
const MAX_REFRESHED_FEATURES = 200;
const MAX_REFRESHED_BATCHES = 20;

/** A user can only hold this many groups, to keep the cookie within size limits */
const MAX_GROUPS = 32;

/**
 * Check if a feature is enabled for the current user
 * Returns the enabled status and assigned variant (if applicable)
 *
 * Calls made in the same tick are batched into a single request.
 *
 * Logic:
 * - If userGroups are specified, only members of those groups get the feature.
 *   Members get it even if enabled=false, and regardless of the rollout percentage.
 *   This allows for internal/beta testing of disabled or partially rolled out features
 * - If no userGroups are specified:
 *   - The enabled flag determines global access
 *   - Rollout percentage applies to all users
 */
export const checkFeature = query.batch(featureKeySchema, async () => {
	const config = await loadConfig();
	const userContext = getUserContext(getRequestEvent());

	return (featureKey): FeatureCheckResult =>
		evaluateFeature(featureKey, getFeature(config, featureKey), userContext);
});

/**
 * Check multiple features at once
 * Returns a record of feature key → result
 */
export const checkFeatures = query(v.array(featureKeySchema), async (featureKeys) => {
	const config = await loadConfig();
	const userContext = getUserContext(getRequestEvent());

	const results: Record<string, FeatureCheckResult> = {};
	for (const key of featureKeys) {
		results[key] = evaluateFeature(key, getFeature(config, key), userContext);
	}
	return results;
});

/**
 * Get the current user's context (ID, groups, variants)
 */
export const getUserInfo = query(async () => {
	return getUserContext(getRequestEvent());
});

/**
 * Group membership changes what features resolve to, so send fresh results back
 * with the command response:
 * - `getUserInfo` is always refreshed
 * - feature checks are refreshed when the caller asks for them with
 *   `joinGroup('beta').updates(checkFeature, checkFeatures)`
 */
async function refreshAfterGroupChange(): Promise<void> {
	await Promise.all([
		getUserInfo().refresh(),
		requested(getUserInfo, 1).refreshAll(),
		requested(checkFeature, MAX_REFRESHED_FEATURES).refreshAll(),
		requested(checkFeatures, MAX_REFRESHED_BATCHES).refreshAll()
	]);
}

/**
 * Add the current user to a beta/test group
 */
export const joinGroup = command(groupSchema, async (group) => {
	const event = getRequestEvent();

	// Ensure user ID is persisted
	ensureUserId(event);

	const { groups } = getUserContext(event);
	if (!groups.includes(group) && groups.length >= MAX_GROUPS) {
		await refreshAfterGroupChange();
		return { success: false, groups };
	}

	const context = addUserToGroup(event, group);
	await refreshAfterGroupChange();

	return {
		success: true,
		groups: context.groups
	};
});

/**
 * Remove the current user from a beta/test group
 */
export const leaveGroup = command(groupSchema, async (group) => {
	const event = getRequestEvent();

	// Ensure user ID is persisted
	ensureUserId(event);

	const context = removeUserFromGroup(event, group);
	await refreshAfterGroupChange();

	return {
		success: true,
		groups: context.groups
	};
});
