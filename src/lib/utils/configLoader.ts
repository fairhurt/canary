import type {
	FeatureFlagsConfig,
	FeatureFlagsOptions,
	ConfigProvider,
	FeatureDefinition,
	RouteDefinition
} from '../types/index.js';

const DEFAULT_CACHE_TTL = 300; // 5 minutes
const EMPTY_CONFIG: FeatureFlagsConfig = { features: {} };

/**
 * Internal state for the config loader
 */
let cachedConfig: FeatureFlagsConfig | null = null;
let configLoadedAt = 0;
let configProvider: ConfigProvider | null = null;
let staticConfig: FeatureFlagsConfig = EMPTY_CONFIG;
let cacheTTL = DEFAULT_CACHE_TTL;
let pendingLoad: Promise<FeatureFlagsConfig> | null = null;
// Bumped on init/invalidate so a load that is still in flight can't repopulate the cache
let generation = 0;

/**
 * Initialize the config loader with options
 */
export function initConfigLoader(options?: FeatureFlagsOptions): void {
	configProvider = options?.configProvider ?? null;
	staticConfig = options?.config ? validateConfig(options.config) : EMPTY_CONFIG;
	cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL;
	invalidateCache();
}

/**
 * Load configuration from the static config or custom provider
 * Implements caching based on TTL
 */
export async function loadConfig(): Promise<FeatureFlagsConfig> {
	// Static config never changes, so there is nothing to refresh
	if (!configProvider) {
		return staticConfig;
	}

	const cacheAge = (Date.now() - configLoadedAt) / 1000;

	// Return cached config if still valid
	if (cachedConfig && cacheAge < cacheTTL) {
		return cachedConfig;
	}

	// Share one provider call between concurrent requests
	if (!pendingLoad) {
		const load = fetchConfig(configProvider, generation).finally(() => {
			if (pendingLoad === load) pendingLoad = null;
		});
		pendingLoad = load;
	}

	return pendingLoad;
}

async function fetchConfig(
	provider: ConfigProvider,
	startedIn: number
): Promise<FeatureFlagsConfig> {
	let config: FeatureFlagsConfig;

	try {
		config = validateConfig(await provider());
	} catch (error) {
		if (cachedConfig) {
			console.warn('[Canary] Failed to load config, using cached version:', error);
			config = cachedConfig;
		} else {
			console.error('[Canary] Failed to load config, using static config:', error);
			config = staticConfig;
		}
	}

	// Failures are cached too, so a broken provider is retried once per TTL
	// rather than on every request
	if (startedIn === generation) {
		cachedConfig = config;
		configLoadedAt = Date.now();
	}

	return config;
}

/**
 * Look up a feature definition, ignoring inherited properties such as "constructor"
 */
export function getFeature(
	config: FeatureFlagsConfig,
	featureKey: string
): FeatureDefinition | undefined {
	return Object.hasOwn(config.features, featureKey) ? config.features[featureKey] : undefined;
}

/**
 * Get a specific feature definition from config
 */
export async function getFeatureConfig(featureKey: string): Promise<FeatureDefinition | undefined> {
	return getFeature(await loadConfig(), featureKey);
}

/**
 * Get all route definitions from config
 */
export async function getRouteConfig(): Promise<Record<string, RouteDefinition>> {
	const config = await loadConfig();
	return config.routes || {};
}

/**
 * Invalidate the cache (useful for testing or forced refresh)
 */
export function invalidateCache(): void {
	cachedConfig = null;
	configLoadedAt = 0;
	pendingLoad = null;
	generation++;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Validate the config structure
 */
export function validateConfig(config: FeatureFlagsConfig): FeatureFlagsConfig {
	if (!config || typeof config !== 'object') {
		throw new Error('Invalid config: must be an object');
	}

	if (!config.features || typeof config.features !== 'object') {
		throw new Error('Invalid config: features must be an object');
	}

	// Validate each feature definition
	for (const [key, feature] of Object.entries(config.features)) {
		const featureDef = feature as FeatureDefinition;

		if (!featureDef || typeof featureDef !== 'object') {
			throw new Error(`Invalid config: feature "${key}" must be an object`);
		}

		if (typeof featureDef.enabled !== 'boolean') {
			throw new Error(`Invalid config: feature "${key}" must have a boolean "enabled" property`);
		}

		if (featureDef.rollout !== undefined) {
			const rollout = featureDef.rollout;
			if (typeof rollout !== 'number' || !(rollout >= 0 && rollout <= 100)) {
				throw new Error(
					`Invalid config: feature "${key}" rollout must be a number between 0 and 100`
				);
			}
		}

		if (featureDef.variants !== undefined && !isStringArray(featureDef.variants)) {
			throw new Error(`Invalid config: feature "${key}" variants must be an array of strings`);
		}

		if (
			featureDef.defaultVariant !== undefined &&
			!featureDef.variants?.includes(featureDef.defaultVariant)
		) {
			throw new Error(
				`Invalid config: feature "${key}" defaultVariant must be one of its variants`
			);
		}

		if (featureDef.userGroups !== undefined && !isStringArray(featureDef.userGroups)) {
			throw new Error(`Invalid config: feature "${key}" userGroups must be an array of strings`);
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

			if (!routeDef || typeof routeDef !== 'object') {
				throw new Error(`Invalid config: route "${path}" must be an object`);
			}

			if (routeDef.feature && !Object.hasOwn(config.features, routeDef.feature)) {
				throw new Error(
					`Invalid config: route "${path}" references non-existent feature "${routeDef.feature}"`
				);
			}
		}
	}

	return config;
}
