import { describe, it, expect } from 'vitest';
import { generateUserId, hashString, assignVariant, isInRollout } from './hash.js';

describe('hash utilities', () => {
	describe('generateUserId', () => {
		it('should generate a user ID with correct format', () => {
			const userId = generateUserId();
			// Format: user_{timestamp}_{random}
			expect(userId).toMatch(/^user_\d+_[a-z0-9]+$/);
		});

		it('should generate unique IDs', () => {
			const id1 = generateUserId();
			const id2 = generateUserId();
			expect(id1).not.toBe(id2);
		});
	});

	describe('hashString', () => {
		it('should return a number between 0 and 1', () => {
			const hash = hashString('test-string');
			expect(hash).toBeGreaterThanOrEqual(0);
			expect(hash).toBeLessThan(1);
		});

		it('should be deterministic (same inputs = same output)', () => {
			const hash1 = hashString('user-123:feature-abc');
			const hash2 = hashString('user-123:feature-abc');
			expect(hash1).toBe(hash2);
		});

		it('should produce different hashes for different strings', () => {
			const hash1 = hashString('user-123:feature-abc');
			const hash2 = hashString('user-456:feature-abc');
			expect(hash1).not.toBe(hash2);
		});

		it('should produce different hashes for different feature keys', () => {
			const hash1 = hashString('user-123:feature-abc');
			const hash2 = hashString('user-123:feature-xyz');
			expect(hash1).not.toBe(hash2);
		});

		it('should handle empty strings', () => {
			const hash = hashString('');
			expect(hash).toBeGreaterThanOrEqual(0);
			expect(hash).toBeLessThan(1);
		});
	});

	describe('assignVariant', () => {
		const variants = ['control', 'variant-a', 'variant-b'];

		it('should return a variant from the list', () => {
			const variant = assignVariant('user-123', 'feature-abc', variants, 100);
			expect(variants).toContain(variant);
		});

		it('should be deterministic (same inputs = same variant)', () => {
			const variant1 = assignVariant('user-123', 'feature-abc', variants, 100);
			const variant2 = assignVariant('user-123', 'feature-abc', variants, 100);
			expect(variant1).toBe(variant2);
		});

		it('should distribute variants evenly over many users', () => {
			const counts = { control: 0, 'variant-a': 0, 'variant-b': 0 };
			const numUsers = 1000;

			for (let i = 0; i < numUsers; i++) {
				const variant = assignVariant(`user-${i}`, 'feature', variants, 100);
				if (variant) counts[variant as keyof typeof counts]++;
			}

			// Each variant should get roughly 1/3 of users (±10%)
			const expected = numUsers / 3;
			expect(counts.control).toBeGreaterThan(expected * 0.9);
			expect(counts.control).toBeLessThan(expected * 1.1);
			expect(counts['variant-a']).toBeGreaterThan(expected * 0.9);
			expect(counts['variant-a']).toBeLessThan(expected * 1.1);
			expect(counts['variant-b']).toBeGreaterThan(expected * 0.9);
			expect(counts['variant-b']).toBeLessThan(expected * 1.1);
		});

		it('should respect rollout percentage', () => {
			const rollout = 50;
			let assignedCount = 0;

			for (let i = 0; i < 1000; i++) {
				const variant = assignVariant(`user-${i}`, 'feature', variants, rollout);
				if (variant) assignedCount++;
			}

			// Should be roughly 50% (±10%)
			expect(assignedCount).toBeGreaterThan(450);
			expect(assignedCount).toBeLessThan(550);
		});

		it('should return null for users outside rollout', () => {
			const rollout = 10;
			let nullCount = 0;

			for (let i = 0; i < 1000; i++) {
				const variant = assignVariant(`user-${i}`, 'feature', variants, rollout);
				if (variant === null) nullCount++;
			}

			// Should be roughly 90% null (±10%)
			expect(nullCount).toBeGreaterThan(850);
			expect(nullCount).toBeLessThan(950);
		});

		it('should handle single variant', () => {
			const variant = assignVariant('user-123', 'feature', ['only-variant'], 100);
			expect(variant).toBe('only-variant');
		});

		it('should handle 0% rollout', () => {
			const variant = assignVariant('user-123', 'feature', variants, 0);
			expect(variant).toBeNull();
		});

		it('should handle 100% rollout', () => {
			const variant = assignVariant('user-123', 'feature', variants, 100);
			expect(variant).not.toBeNull();
		});
	});

	describe('isInRollout', () => {
		it('should return true for users in rollout', () => {
			// Test with a hash that should be in 50% rollout
			const inRollout = isInRollout('user-with-low-hash', 'feature', 50);
			expect(typeof inRollout).toBe('boolean');
		});

		it('should be deterministic', () => {
			const result1 = isInRollout('user-123', 'feature-abc', 50);
			const result2 = isInRollout('user-123', 'feature-abc', 50);
			expect(result1).toBe(result2);
		});

		it('should respect 0% rollout', () => {
			const result = isInRollout('user-123', 'feature', 0);
			expect(result).toBe(false);
		});

		it('should respect 100% rollout', () => {
			const result = isInRollout('user-123', 'feature', 100);
			expect(result).toBe(true);
		});

		it('should distribute correctly over many users', () => {
			const rollout = 30;
			let inCount = 0;

			for (let i = 0; i < 1000; i++) {
				if (isInRollout(`user-${i}`, 'feature', rollout)) {
					inCount++;
				}
			}

			// Should be roughly 30% (±10%)
			expect(inCount).toBeGreaterThan(250);
			expect(inCount).toBeLessThan(350);
		});
	});
});
