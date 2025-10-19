/**
 * Feature flag configuration types
 */

/**
 * Configuration for a single feature flag
 */
export interface FeatureDefinition {
	/** Whether the feature is enabled globally */
	enabled: boolean;
	/** Percentage of users to enable (0-100) */
	rollout?: number;
	/** Available variants for A/B testing */
	variants?: string[];
	/** Default variant to assign */
	defaultVariant?: string;
	/** User groups that have access to this feature */
	userGroups?: string[];
	/** Description of the feature (for documentation) */
	description?: string;
}

/**
 * Configuration for route redirects based on features
 */
export interface RouteDefinition {
	/** Route to redirect to if feature is enabled */
	enabled?: string;
	/** Route to redirect to if feature is disabled */
	disabled?: string;
	/** Route to redirect to for specific user groups */
	[key: string]: string | undefined;
	/** Feature flag key that controls this route */
	feature?: string;
	/** User group required to access this route */
	requiresGroup?: string;
}

/**
 * Complete feature flags configuration
 */
export interface FeatureFlagsConfig {
	/** Feature flag definitions */
	features: Record<string, FeatureDefinition>;
	/** Route redirect definitions */
	routes?: Record<string, RouteDefinition>;
}

/**
 * User context containing groups and variant assignments
 */
export interface UserContext {
	/** Unique user ID (generated or provided) */
	userId: string;
	/** User groups the user belongs to (beta, internal, etc.) */
	groups: string[];
	/** Feature variant assignments for this user */
	variants: Record<string, string>;
}

/**
 * Result of a feature check
 */
export interface FeatureCheckResult {
	/** Whether the feature is enabled for this user */
	enabled: boolean;
	/** The variant assigned to this user (if applicable) */
	variant?: string;
	/** Reason for the result (for debugging) */
	reason?: string;
}

/**
 * Custom configuration provider function
 * Allows users to fetch configuration from external sources
 */
export type ConfigProvider = () => Promise<FeatureFlagsConfig> | FeatureFlagsConfig;

/**
 * Options for initializing the feature flags library
 */
export interface FeatureFlagsOptions {
	/** Custom configuration provider (overrides static JSON) */
	configProvider?: ConfigProvider;
	/** Enable debug mode for development */
	debug?: boolean;
	/** Cookie name for user ID */
	userIdCookie?: string;
	/** Cookie name for user groups */
	groupsCookie?: string;
	/** Cookie name for variant assignments */
	variantsCookie?: string;
	/** Cache TTL in seconds for dynamic configs (default: 300) */
	cacheTTL?: number;
}

/**
 * Internal state for the feature flags library
 */
export interface FeatureFlagsState {
	config: FeatureFlagsConfig;
	options: Required<FeatureFlagsOptions>;
	configLoadedAt?: number;
}
