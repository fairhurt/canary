import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, invalidateCache, initConfigLoader } from './configLoader.js';
import type { ConfigProvider, FeatureFlagsConfig } from '../types/index.js';
import demoConfig from '../../features.config.json' with { type: 'json' };

describe('configLoader', () => {
	beforeEach(() => {
		initConfigLoader({ config: demoConfig });
	});

	describe('loadConfig without any config', () => {
		it('should fall back to an empty config', async () => {
			initConfigLoader();
			const config = await loadConfig();

			expect(config.features).toEqual({});
		});
	});

	describe('loadConfig with static config', () => {
		it('should load the static config', async () => {
			const config = await loadConfig();

			expect(config).toBeDefined();
			expect(config.features).toBeDefined();
			expect(typeof config.features).toBe('object');
		});

		it('should reject an invalid static config at init', () => {
			expect(() =>
				initConfigLoader({
					config: { features: { broken: { enabled: 'yes' } } } as unknown as FeatureFlagsConfig
				})
			).toThrow(/boolean "enabled"/);
		});

		it('should reject a defaultVariant that is not one of the variants', () => {
			expect(() =>
				initConfigLoader({
					config: {
						features: { test: { enabled: true, variants: ['a', 'b'], defaultVariant: 'c' } }
					}
				})
			).toThrow(/defaultVariant/);
		});

		it('should include predefined features', async () => {
			const config = await loadConfig();

			expect(config.features['new-dashboard']).toBeDefined();
			expect(config.features['beta-checkout']).toBeDefined();
			expect(config.features['ab-test-homepage']).toBeDefined();
			expect(config.features['experimental-feature']).toBeDefined();
		});

		it('should cache the config', async () => {
			initConfigLoader({ config: demoConfig, cacheTTL: 300 });
			const config1 = await loadConfig();
			const config2 = await loadConfig();

			expect(config1).toBe(config2); // Same reference = cached
		});

		it('should refresh cache after TTL', async () => {
			initConfigLoader({ config: demoConfig, cacheTTL: 0.001 }); // 1ms TTL
			const config1 = await loadConfig();

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 10));

			const config2 = await loadConfig();

			// Content should be the same even if references might differ
			expect(config2.features).toEqual(config1.features);
		});

		it('should include routes configuration', async () => {
			const config = await loadConfig();

			expect(config.routes).toBeDefined();
			expect(config.routes?.['/dashboard']).toBeDefined();
		});
	});

	describe('loadConfig with custom provider', () => {
		it('should use custom provider when provided', async () => {
			const customProvider: ConfigProvider = async () => ({
				features: {
					'custom-feature': {
						enabled: true,
						rollout: 100,
						description: 'Custom feature'
					}
				},
				routes: {}
			});

			initConfigLoader({ configProvider: customProvider });
			const config = await loadConfig();

			expect(config.features['custom-feature']).toBeDefined();
			expect(config.features['custom-feature'].enabled).toBe(true);
		});

		it('should call provider function', async () => {
			const getConfigMock = vi.fn().mockResolvedValue({
				features: { test: { enabled: true, rollout: 100 } },
				routes: {}
			});

			const customProvider: ConfigProvider = getConfigMock;

			initConfigLoader({ configProvider: customProvider });
			await loadConfig();

			expect(getConfigMock).toHaveBeenCalledOnce();
		});

		it('should cache provider results', async () => {
			const getConfigMock = vi.fn().mockResolvedValue({
				features: { test: { enabled: true, rollout: 100 } },
				routes: {}
			});

			const customProvider: ConfigProvider = getConfigMock;

			initConfigLoader({ configProvider: customProvider, cacheTTL: 300 });
			await loadConfig();
			await loadConfig();

			// Should only be called once due to caching
			expect(getConfigMock).toHaveBeenCalledOnce();
		});

		it('should refresh provider cache after TTL', async () => {
			const getConfigMock = vi.fn().mockResolvedValue({
				features: { test: { enabled: true, rollout: 100 } },
				routes: {}
			});

			const customProvider: ConfigProvider = getConfigMock;

			initConfigLoader({ configProvider: customProvider, cacheTTL: 0.001 });
			await loadConfig();

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 10));

			await loadConfig();

			// Should be called twice (once for each load after cache expiry)
			expect(getConfigMock).toHaveBeenCalledTimes(2);
		});
	});

	describe('provider edge cases', () => {
		const valid: FeatureFlagsConfig = { features: { test: { enabled: true } } };

		it('should not cache when cacheTTL is 0', async () => {
			const provider = vi.fn().mockResolvedValue(valid);

			initConfigLoader({ configProvider: provider, cacheTTL: 0 });
			await loadConfig();
			await loadConfig();

			expect(provider).toHaveBeenCalledTimes(2);
		});

		it('should share one provider call between concurrent loads', async () => {
			const provider = vi.fn().mockResolvedValue(valid);

			initConfigLoader({ configProvider: provider });
			const [a, b] = await Promise.all([loadConfig(), loadConfig()]);

			expect(provider).toHaveBeenCalledOnce();
			expect(a).toBe(b);
		});

		it('should fall back to the static config when the provider fails', async () => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			const provider = vi.fn().mockRejectedValue(new Error('offline'));

			initConfigLoader({ config: demoConfig, configProvider: provider });
			const config = await loadConfig();

			expect(config.features['new-dashboard']).toBeDefined();
			error.mockRestore();
		});

		it('should keep serving the last good config when a refresh fails', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const provider = vi.fn().mockResolvedValueOnce(valid).mockRejectedValue(new Error('offline'));

			initConfigLoader({ configProvider: provider, cacheTTL: 0 });
			await loadConfig();
			const config = await loadConfig();

			expect(config).toBe(valid);
			warn.mockRestore();
		});

		it('should not retry a failing provider on every request', async () => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			const provider = vi.fn().mockRejectedValue(new Error('offline'));

			initConfigLoader({ configProvider: provider, cacheTTL: 300 });
			await loadConfig();
			await loadConfig();

			expect(provider).toHaveBeenCalledOnce();
			error.mockRestore();
		});
	});

	describe('invalidateCache', () => {
		it('should clear the cache', async () => {
			initConfigLoader({ config: demoConfig, cacheTTL: 300 });
			const config1 = await loadConfig();

			invalidateCache();

			const config2 = await loadConfig();

			// Content should be the same even after cache clear
			expect(config2.features).toEqual(config1.features);
		});

		it('should force reload from provider', async () => {
			let callCount = 0;
			const customProvider: ConfigProvider = async () => {
				callCount++;
				return {
					features: { test: { enabled: true, rollout: 100 } },
					routes: {}
				};
			};

			initConfigLoader({ configProvider: customProvider, cacheTTL: 300 });
			await loadConfig();
			expect(callCount).toBe(1);

			await loadConfig();
			expect(callCount).toBe(1); // Still cached

			invalidateCache();

			await loadConfig();
			expect(callCount).toBe(2); // Reloaded
		});
	});
});
