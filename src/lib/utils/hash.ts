/**
 * Hashing and ID generation utilities for feature flags
 */

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
	return `user_${crypto.randomUUID()}`;
}

/**
 * Hash a string to a number in the range [0, 1)
 * Used for deterministic rollout and variant assignment
 */
export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash | 0; // Convert to 32bit integer
	}
	// |hash| is at most 2^31, so the modulo keeps the result strictly below 1
	return (Math.abs(hash) % 2147483648) / 2147483648;
}

/**
 * Check if user should be included in a percentage-based rollout
 */
export function isInRollout(userId: string, featureKey: string, rollout: number): boolean {
	if (rollout >= 100) return true;
	if (!(rollout > 0)) return false;

	const hash = hashString(`${userId}:${featureKey}:rollout`);
	return hash * 100 < rollout;
}

/**
 * Deterministically assign a variant based on user ID and feature key
 * Uses consistent hashing to ensure the same user always gets the same variant
 *
 * Returns `null` when there are no variants or the user is outside the rollout
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

	if (!isInRollout(userId, featureKey, rollout)) {
		return null;
	}

	const variantHash = hashString(`${userId}:${featureKey}:variant`);
	const index = Math.min(Math.floor(variantHash * variants.length), variants.length - 1);
	return variants[index];
}
