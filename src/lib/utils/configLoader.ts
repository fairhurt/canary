import type {
	FeatureFlagsConfig,
	FeatureFlagsOptions,
	ConfigProvider,
	FeatureDefinition,
	RouteDefinition
} from '../types/index.js';
import defaultConfig from '../features.config.json' with { type: 'json' };

/**
 * Internal state for the config loader
 */
let cachedConfig: FeatureFlagsConfig | null = null;
let configLoadedAt = 0;
let configProvider: ConfigProvider | null = null;
let cacheTTL = 300; // 5 minutes default

/**
 * Initialize the config loader with options
 */
export function initConfigLoader(options?: FeatureFlagsOptions): void {
	configProvider = options?.configProvider || null;
	cacheTTL = options?.cacheTTL || 300;
	cachedConfig = null; // Reset cache on init
	configLoadedAt = 0;
}

/**
 * Load configuration from static JSON or custom provider
 * Implements caching based on TTL
 */
export async function loadConfig(): Promise<FeatureFlagsConfig> {
	const now = Date.now();
	const cacheAge = (now - configLoadedAt) / 1000;

	// Return cached config if still valid
	if (cachedConfig && cacheAge < cacheTTL) {
		return cachedConfig;
	}

	try {
		// Use custom provider if available
		if (configProvider) {
			const config = await Promise.resolve(configProvider());
			cachedConfig = validateConfig(config);
			configLoadedAt = now;
			return cachedConfig;
		}

		// Fall back to static JSON
		cachedConfig = validateConfig(defaultConfig as FeatureFlagsConfig);
		configLoadedAt = now;
		return cachedConfig;
	} catch (error) {
		// If fetching new config fails but we have cached config, return it
		if (cachedConfig) {
			console.warn('[Canary] Failed to load config, using cached version:', error);
			return cachedConfig;
		}

		// Otherwise fall back to default config
		console.error('[Canary] Failed to load config, using default:', error);
		cachedConfig = validateConfig(defaultConfig as FeatureFlagsConfig);
		configLoadedAt = now;
		return cachedConfig;
	}
}

/**
 * Get a specific feature definition from config
 */
export async function getFeatureConfig(featureKey: string) {
	const config = await loadConfig();
	return config.features[featureKey];
}

/**
 * Get all route definitions from config
 */
export async function getRouteConfig() {
	const config = await loadConfig();
	return config.routes || {};
}

/**
 * Invalidate the cache (useful for testing or forced refresh)
 */
export function invalidateCache(): void {
	cachedConfig = null;
	configLoadedAt = 0;
}

/**
 * Validate and normalize the config structure
 */
function validateConfig(config: FeatureFlagsConfig): FeatureFlagsConfig {
	if (!config || typeof config !== 'object') {
		throw new Error('Invalid config: must be an object');
	}

	if (!config.features || typeof config.features !== 'object') {
		throw new Error('Invalid config: features must be an object');
	}

	// Validate each feature definition
	for (const [key, feature] of Object.entries(config.features)) {
		const featureDef = feature as FeatureDefinition;

		if (typeof featureDef.enabled !== 'boolean') {
			throw new Error(`Invalid config: feature "${key}" must have a boolean "enabled" property`);
		}

		if (featureDef.rollout !== undefined) {
			const rollout = featureDef.rollout;
			if (typeof rollout !== 'number' || rollout < 0 || rollout > 100) {
				throw new Error(
					`Invalid config: feature "${key}" rollout must be a number between 0 and 100`
				);
			}
		}

		if (featureDef.variants && !Array.isArray(featureDef.variants)) {
			throw new Error(`Invalid config: feature "${key}" variants must be an array`);
		}

		if (featureDef.userGroups && !Array.isArray(featureDef.userGroups)) {
			throw new Error(`Invalid config: feature "${key}" userGroups must be an array`);
		}
	}

	// Validate routes if present
	if (config.routes) {
		if (typeof config.routes !== 'object') {
			throw new Error('Invalid config: routes must be an object');
		}

		for (const [path, route] of Object.entries(config.routes)) {
			const routeDef = route as RouteDefinition;

			if (!path.startsWith('/')) {
				throw new Error(`Invalid config: route path "${path}" must start with /`);
			}

			if (routeDef.feature && !config.features[routeDef.feature]) {
				throw new Error(
					`Invalid config: route "${path}" references non-existent feature "${routeDef.feature}"`
				);
			}
		}
	}

	return config;
}
