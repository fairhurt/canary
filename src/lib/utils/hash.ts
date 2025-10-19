/**
 * Hashing and ID generation utilities for feature flags
 */

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
	return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Hash a string to a number between 0 and 1
 * Used for deterministic variant assignment
 */
export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash) / 2147483647; // Normalize to 0-1
}

/**
 * Deterministically assign a variant based on user ID and feature key
 * Uses consistent hashing to ensure the same user always gets the same variant
 */
export function assignVariant(
	userId: string,
	featureKey: string,
	variants: string[],
	rollout: number = 100
): string | null {
	if (!variants || variants.length === 0) {
		return null;
	}

	// Check if user should be included based on rollout percentage
	const rolloutHash = hashString(`${userId}:${featureKey}:rollout`);
	if (rolloutHash * 100 > rollout) {
		return null; // User not included in rollout
	}

	// Assign variant deterministically
	const variantHash = hashString(`${userId}:${featureKey}:variant`);
	const index = Math.floor(variantHash * variants.length);
	return variants[index];
}

/**
 * Check if user should be included in a percentage-based rollout
 */
export function isInRollout(userId: string, featureKey: string, rollout: number): boolean {
	const hash = hashString(`${userId}:${featureKey}:rollout`);
	return hash * 100 <= rollout;
}
