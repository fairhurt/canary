// Initialization
export { initCanary, defineConfig } from './init.js';

// Server hooks
export { handleFeatureRouting } from './hooks/featureRouting.js';

// Components
export { default as Feature } from './components/Feature.svelte';
export { default as BetaToggle } from './components/BetaToggle.svelte';
export { default as FeatureDebug } from './components/FeatureDebug.svelte';

// Remote functions (for use in components)
export {
	checkFeature,
	checkFeatures,
	getUserInfo,
	joinGroup,
	leaveGroup
} from './features.remote.js';

// Types
export type {
	FeatureDefinition,
	RouteDefinition,
	FeatureFlagsConfig,
	UserContext,
	FeatureCheckResult,
	ConfigProvider,
	FeatureFlagsOptions
} from './types/index.ts';
