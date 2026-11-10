import { describe, it, expect } from 'vitest';
import { evaluateFeature } from './evaluate.js';
import { isInRollout } from './hash.js';
import type { FeatureDefinition, UserContext } from '../types/index.js';

function user(overrides: Partial<UserContext> = {}): UserContext {
	return { userId: 'user-1', groups: [], variants: {}, ...overrides };
}

/** Find a user ID that is inside (or outside) a rollout, so tests don't depend on hash values */
function findUser(featureKey: string, rollout: number, inside: boolean): string {
	for (let i = 0; i < 10_000; i++) {
		const userId = `user-${i}`;
		if (isInRollout(userId, featureKey, rollout) === inside) return userId;
	}
	throw new Error('No matching user found');
}

describe('evaluateFeature', () => {
	it('should report unknown features as disabled', () => {
		expect(evaluateFeature('missing', undefined, user())).toEqual({
			enabled: false,
			reason: 'Feature not found'
		});
	});

	describe('without userGroups', () => {
		it('should enable a fully rolled out feature', () => {
			const result = evaluateFeature('on', { enabled: true, rollout: 100 }, user());

			expect(result.enabled).toBe(true);
			expect(result.variant).toBeUndefined();
		});

		it('should default to a 100% rollout', () => {
			expect(evaluateFeature('on', { enabled: true }, user()).enabled).toBe(true);
		});

		it('should disable a globally disabled feature', () => {
			expect(evaluateFeature('off', { enabled: false }, user())).toEqual({
				enabled: false,
				reason: 'Feature is globally disabled'
			});
		});

		it('should apply the rollout percentage', () => {
			const def: FeatureDefinition = { enabled: true, rollout: 50 };
			const inside = user({ userId: findUser('half', 50, true) });
			const outside = user({ userId: findUser('half', 50, false) });

			expect(evaluateFeature('half', def, inside).enabled).toBe(true);
			expect(evaluateFeature('half', def, outside)).toEqual({
				enabled: false,
				reason: 'User not in rollout percentage'
			});
		});

		it('should disable a 0% rollout for everyone', () => {
			const def: FeatureDefinition = { enabled: true, rollout: 0 };

			for (let i = 0; i < 200; i++) {
				expect(evaluateFeature('none', def, user({ userId: `user-${i}` })).enabled).toBe(false);
			}
		});
	});

	describe('with userGroups', () => {
		const def: FeatureDefinition = { enabled: true, userGroups: ['beta', 'internal'] };

		it('should disable the feature for users outside the groups', () => {
			expect(evaluateFeature('gated', def, user())).toEqual({
				enabled: false,
				reason: 'User not in required group'
			});
		});

		it('should enable the feature for members of any listed group', () => {
			expect(evaluateFeature('gated', def, user({ groups: ['internal'] })).enabled).toBe(true);
		});

		it('should let members in even when the feature is disabled', () => {
			const disabled: FeatureDefinition = { enabled: false, userGroups: ['internal'] };

			expect(evaluateFeature('gated', disabled, user({ groups: ['internal'] })).enabled).toBe(true);
			expect(evaluateFeature('gated', disabled, user()).enabled).toBe(false);
		});

		it('should let members bypass the rollout percentage', () => {
			const partial: FeatureDefinition = { enabled: true, rollout: 10, userGroups: ['beta'] };
			const outside = findUser('gated', 10, false);

			expect(
				evaluateFeature('gated', partial, user({ userId: outside, groups: ['beta'] })).enabled
			).toBe(true);
		});

		it('should treat an empty userGroups array as no group requirement', () => {
			expect(evaluateFeature('open', { enabled: true, userGroups: [] }, user()).enabled).toBe(true);
		});
	});

	describe('variants', () => {
		const def: FeatureDefinition = {
			enabled: true,
			variants: ['control', 'variant-a', 'variant-b'],
			defaultVariant: 'control'
		};

		it('should assign one of the variants', () => {
			const result = evaluateFeature('ab', def, user());

			expect(result.enabled).toBe(true);
			expect(def.variants).toContain(result.variant);
		});

		it('should assign the same variant every time', () => {
			const first = evaluateFeature('ab', def, user({ userId: 'stable' }));
			const second = evaluateFeature('ab', def, user({ userId: 'stable' }));

			expect(second.variant).toBe(first.variant);
		});

		it('should use every variant across many users', () => {
			const seen = new Set<string | undefined>();
			for (let i = 0; i < 500; i++) {
				seen.add(evaluateFeature('ab', def, user({ userId: `user-${i}` })).variant);
			}

			expect([...seen].sort()).toEqual(['control', 'variant-a', 'variant-b']);
		});

		it('should prefer a persisted variant', () => {
			const result = evaluateFeature('ab', def, user({ variants: { ab: 'variant-b' } }));

			expect(result.variant).toBe('variant-b');
		});

		it('should ignore a persisted variant that no longer exists', () => {
			const result = evaluateFeature('ab', def, user({ variants: { ab: 'removed' } }));

			expect(def.variants).toContain(result.variant);
		});

		it('should spread group members outside the rollout across variants', () => {
			const partial: FeatureDefinition = { ...def, rollout: 1, userGroups: ['beta'] };
			const seen = new Set<string | undefined>();

			for (let i = 0; i < 500; i++) {
				const result = evaluateFeature('ab', partial, user({ userId: `u${i}`, groups: ['beta'] }));
				seen.add(result.variant);
			}

			expect(seen.size).toBe(3);
		});

		it('should not return a variant for an empty variants array', () => {
			const result = evaluateFeature('ab', { enabled: true, variants: [] }, user());

			expect(result).toEqual({ enabled: true, reason: 'Feature enabled' });
		});
	});
});
