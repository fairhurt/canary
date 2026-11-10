import type { FeatureCheckResult, FeatureDefinition, UserContext } from '../types/index.js';
import { assignVariant, isInRollout } from './hash.js';

/**
 * Evaluate a feature flag for a user. This is the single source of truth used by
 * the remote functions and the routing hook.
 *
 * - If `userGroups` are specified, only members of those groups get the feature.
 *   Members get it even when `enabled` is `false`, and regardless of `rollout`.
 * - Otherwise the feature must be `enabled` and the user must fall inside the
 *   `rollout` percentage (default 100).
 */
export function evaluateFeature(
	featureKey: string,
	featureDef: FeatureDefinition | undefined,
	userContext: UserContext
): FeatureCheckResult {
	if (!featureDef || typeof featureDef !== 'object') {
		return { enabled: false, reason: 'Feature not found' };
	}

	if (featureDef.userGroups && featureDef.userGroups.length > 0) {
		const hasRequiredGroup = featureDef.userGroups.some((group) =>
			userContext.groups.includes(group)
		);

		if (!hasRequiredGroup) {
			return { enabled: false, reason: 'User not in required group' };
		}
	} else {
		if (!featureDef.enabled) {
			return { enabled: false, reason: 'Feature is globally disabled' };
		}

		if (!isInRollout(userContext.userId, featureKey, featureDef.rollout ?? 100)) {
			return { enabled: false, reason: 'User not in rollout percentage' };
		}
	}

	if (featureDef.variants && featureDef.variants.length > 0) {
		// A persisted assignment wins, as long as that variant still exists
		const persisted = userContext.variants[featureKey];
		const variant =
			persisted && featureDef.variants.includes(persisted)
				? persisted
				: // Rollout was already decided above, so only pick the variant here
					(assignVariant(userContext.userId, featureKey, featureDef.variants) ??
					featureDef.defaultVariant ??
					featureDef.variants[0]);

		return { enabled: true, variant, reason: 'Feature enabled with variant' };
	}

	return { enabled: true, reason: 'Feature enabled' };
}
