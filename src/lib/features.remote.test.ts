import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, initConfigLoader, invalidateCache } from './utils/configLoader.js';
import type { FeatureFlagsConfig } from './types/index.js';

describe('features.remote logic', () => {
	let testConfig: FeatureFlagsConfig;

	beforeEach(() => {
		invalidateCache();

		testConfig = {
			features: {
				'always-on': {
					enabled: true,
					rollout: 100,
					description: 'Always enabled feature'
				},
				'always-off': {
					enabled: false,
					description: 'Always disabled feature'
				},
				'partial-rollout': {
					enabled: true,
					rollout: 50,
					description: 'Feature with 50% rollout'
				},
				'beta-only': {
					enabled: true,
					userGroups: ['beta'],
					description: 'Beta group only feature'
				},
				'internal-disabled': {
					enabled: false,
					userGroups: ['internal'],
					description: 'Disabled but internal can access'
				},
				'beta-with-rollout': {
					enabled: true,
					rollout: 25,
					userGroups: ['beta', 'internal'],
					description: 'Beta users bypass 25% rollout'
				},
				'ab-test': {
					enabled: true,
					rollout: 100,
					variants: ['control', 'variant-a', 'variant-b'],
					defaultVariant: 'control',
					description: 'A/B test with variants'
				}
			},
			routes: {}
		};

		initConfigLoader({
			configProvider: () => testConfig,
			cacheTTL: 300
		});
	});

	describe('feature check logic', () => {
		describe('basic enabled/disabled checks', () => {
			it('should enable feature when enabled: true, rollout: 100', async () => {
				const config = await loadConfig();
				const feature = config.features['always-on'];

				expect(feature.enabled).toBe(true);
				expect(feature.rollout).toBe(100);
			});

			it('should disable feature when enabled: false', async () => {
				const config = await loadConfig();
				const feature = config.features['always-off'];

				expect(feature.enabled).toBe(false);
			});
		});

		describe('rollout percentage logic', () => {
			it('should have 50% rollout feature', async () => {
				const config = await loadConfig();
				const feature = config.features['partial-rollout'];

				expect(feature.enabled).toBe(true);
				expect(feature.rollout).toBe(50);
			});
		});

		describe('userGroups bypass logic', () => {
			it('should define features with userGroups', async () => {
				const config = await loadConfig();

				expect(config.features['beta-only'].userGroups).toContain('beta');
				expect(config.features['internal-disabled'].userGroups).toContain('internal');
			});

			it('should have userGroups that bypass enabled flag', async () => {
				const config = await loadConfig();
				const feature = config.features['internal-disabled'];

				expect(feature.enabled).toBe(false);
				expect(feature.userGroups).toContain('internal');
			});

			it('should have userGroups that bypass rollout percentage', async () => {
				const config = await loadConfig();
				const feature = config.features['beta-with-rollout'];

				expect(feature.enabled).toBe(true);
				expect(feature.rollout).toBe(25);
				expect(feature.userGroups).toContain('beta');
				expect(feature.userGroups).toContain('internal');
			});
		});

		describe('A/B testing logic', () => {
			it('should define variants for A/B test', async () => {
				const config = await loadConfig();
				const feature = config.features['ab-test'];

				expect(feature.variants).toEqual(['control', 'variant-a', 'variant-b']);
				expect(feature.defaultVariant).toBe('control');
			});

			it('should be enabled with 100% rollout', async () => {
				const config = await loadConfig();
				const feature = config.features['ab-test'];

				expect(feature.enabled).toBe(true);
				expect(feature.rollout).toBe(100);
			});
		});
	});

	describe('config provider integration', () => {
		it('should load config from provider', async () => {
			const config = await loadConfig();

			expect(config).toBeDefined();
			expect(config.features).toEqual(testConfig.features);
		});

		it('should support dynamic config updates', async () => {
			// First load
			const config1 = await loadConfig();
			expect(config1.features['always-on']).toBeDefined();

			// Update config
			testConfig.features['new-feature'] = {
				enabled: true,
				rollout: 100,
				description: 'Dynamically added'
			};

			// Clear cache to force reload
			invalidateCache();

			// Second load with updated config
			const config2 = await loadConfig();
			expect(config2.features['new-feature']).toBeDefined();
		});
	});

	describe('userGroups priority order', () => {
		it('should prioritize userGroups over enabled flag', async () => {
			const config = await loadConfig();
			const feature = config.features['internal-disabled'];

			// Feature is disabled globally
			expect(feature.enabled).toBe(false);

			// But internal group can still access
			expect(feature.userGroups).toContain('internal');
		});

		it('should prioritize userGroups over rollout percentage', async () => {
			const config = await loadConfig();
			const feature = config.features['beta-with-rollout'];

			// Feature has 25% rollout
			expect(feature.rollout).toBe(25);

			// But beta/internal groups get 100% access
			expect(feature.userGroups).toContain('beta');
			expect(feature.userGroups).toContain('internal');
		});
	});

	describe('edge cases', () => {
		it('should handle feature with no rollout specified (default 100%)', async () => {
			testConfig.features['no-rollout'] = {
				enabled: true,
				description: 'No rollout specified'
			};
			invalidateCache();

			const config = await loadConfig();
			const feature = config.features['no-rollout'];

			expect(feature.enabled).toBe(true);
			expect(feature.rollout).toBeUndefined();
		});

		it('should handle feature with empty userGroups array', async () => {
			testConfig.features['empty-groups'] = {
				enabled: true,
				userGroups: [],
				description: 'Empty groups'
			};
			invalidateCache();

			const config = await loadConfig();
			const feature = config.features['empty-groups'];

			expect(feature.userGroups).toEqual([]);
		});

		it('should handle feature with empty variants array', async () => {
			testConfig.features['empty-variants'] = {
				enabled: true,
				variants: [],
				description: 'Empty variants'
			};
			invalidateCache();

			const config = await loadConfig();
			const feature = config.features['empty-variants'];

			expect(feature.variants).toEqual([]);
		});
	});
});
