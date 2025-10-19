import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, invalidateCache, initConfigLoader } from './configLoader.js';
import type { ConfigProvider } from '../types/index.js';

describe('configLoader', () => {
	beforeEach(() => {
		invalidateCache();
	});

	describe('loadConfig with static config', () => {
		it('should load the default static config', async () => {
			const config = await loadConfig();
			
			expect(config).toBeDefined();
			expect(config.features).toBeDefined();
			expect(typeof config.features).toBe('object');
		});

		it('should include predefined features', async () => {
			const config = await loadConfig();
			
			expect(config.features['new-dashboard']).toBeDefined();
			expect(config.features['beta-checkout']).toBeDefined();
			expect(config.features['ab-test-homepage']).toBeDefined();
			expect(config.features['experimental-feature']).toBeDefined();
		});

		it('should cache the config', async () => {
			initConfigLoader({ cacheTTL: 300 });
			const config1 = await loadConfig();
			const config2 = await loadConfig();
			
			expect(config1).toBe(config2); // Same reference = cached
		});

		it('should refresh cache after TTL', async () => {
			initConfigLoader({ cacheTTL: 0.001 }); // 1ms TTL
			const config1 = await loadConfig();
			
			// Wait for TTL to expire
			await new Promise(resolve => setTimeout(resolve, 10));
			
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
			await new Promise(resolve => setTimeout(resolve, 10));
			
			await loadConfig();
			
			// Should be called twice (once for each load after cache expiry)
			expect(getConfigMock).toHaveBeenCalledTimes(2);
		});
	});

	describe('invalidateCache', () => {
		it('should clear the cache', async () => {
			initConfigLoader({ cacheTTL: 300 });
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
