/**
 * Remote functions used only by the demo page. They expose things a real app
 * would keep on the server (the flag config, the visitor's rollout bucket) so
 * the page can show how each decision was made.
 */

import { command, getRequestEvent, query, requested } from '$app/server';
import config from '../features.config.json' with { type: 'json' };
import { checkFeature, checkFeatures, getUserInfo } from '../lib/features.remote.js';
import { resolveRedirect } from '../lib/hooks/featureRouting.js';
import type { FeatureFlagsConfig } from '../lib/types/index.js';
import { assignVariant, rolloutBucket } from '../lib/utils/hash.js';
import { ensureUserId, getUserContext } from '../lib/utils/userContext.js';

const demoConfig: FeatureFlagsConfig = config;

const AB_TEST = 'ab-test-homepage';
const SIMULATED_VISITORS = 3000;

/** The demo's flag config, plus where this visitor sits in each feature's rollout */
export const getDemoState = query(async () => {
	const { userId } = getUserContext(getRequestEvent());

	const buckets: Record<string, number> = {};
	for (const key of Object.keys(demoConfig.features)) {
		buckets[key] = rolloutBucket(userId, key);
	}

	return { features: demoConfig.features, buckets };
});

/** Where each configured route would send this visitor right now */
export const getRouteDestinations = query(async () => {
	const userContext = getUserContext(getRequestEvent());

	return Object.keys(demoConfig.routes ?? {}).map((path) => ({
		path,
		destination: resolveRedirect(demoConfig, path, userContext) ?? null
	}));
});

/** How the A/B test splits a few thousand simulated visitors */
export const getVariantDistribution = query(async () => {
	const variants = demoConfig.features[AB_TEST].variants ?? [];
	const counts = new Map(variants.map((variant) => [variant, 0]));

	for (let i = 0; i < SIMULATED_VISITORS; i++) {
		const variant = assignVariant(`simulated-visitor-${i}`, AB_TEST, variants);
		if (variant) counts.set(variant, (counts.get(variant) ?? 0) + 1);
	}

	return variants.map((variant) => ({
		variant,
		share: (counts.get(variant) ?? 0) / SIMULATED_VISITORS
	}));
});

/** Forget this visitor and start again as a brand new one */
export const resetIdentity = command(async () => {
	const event = getRequestEvent();

	for (const name of ['canary_user_id', 'canary_groups', 'canary_variants']) {
		event.cookies.delete(name, { path: '/' });
	}
	ensureUserId(event);

	await Promise.all([
		getUserInfo().refresh(),
		getDemoState().refresh(),
		getRouteDestinations().refresh(),
		requested(getUserInfo, 1).refreshAll(),
		requested(getDemoState, 1).refreshAll(),
		requested(getRouteDestinations, 1).refreshAll(),
		requested(checkFeature, 200).refreshAll(),
		requested(checkFeatures, 20).refreshAll()
	]);
});
