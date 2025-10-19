import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserContext, ensureUserId, addUserToGroup, removeUserFromGroup } from './userContext.js';
import type { RequestEvent } from '@sveltejs/kit';

describe('userContext', () => {
	let mockEvent: Partial<RequestEvent>;
	let mockCookies: Map<string, string>;

	beforeEach(() => {
		mockCookies = new Map();
		
		mockEvent = {
			cookies: {
				get: (name: string) => mockCookies.get(name),
				set: (name: string, value: string) => {
					mockCookies.set(name, value);
				},
				delete: (name: string) => {
					mockCookies.delete(name);
				},
				getAll: () => [],
				serialize: () => ''
			}
		} as Partial<RequestEvent>;
	});

	describe('getUserContext', () => {
		it('should return user context with generated user ID when no cookies exist', () => {
			const context = getUserContext(mockEvent as RequestEvent);
			
			expect(context).toBeDefined();
			expect(context.userId).toBeDefined();
			expect(context.userId).toMatch(/^user_/);
			expect(context.groups).toEqual([]);
			expect(context.variants).toEqual({});
		});

		it('should return existing user ID from cookie', () => {
			mockCookies.set('canary_user_id', 'existing-user-123');
			
			const context = getUserContext(mockEvent as RequestEvent);
			
			expect(context.userId).toBe('existing-user-123');
		});

		it('should parse groups from cookie', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['beta', 'internal']));
			
			const context = getUserContext(mockEvent as RequestEvent);
			
			expect(context.groups).toEqual(['beta', 'internal']);
		});

		it('should parse variants from cookie', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_variants', JSON.stringify({
				'feature-a': 'variant-1',
				'feature-b': 'variant-2'
			}));
			
			const context = getUserContext(mockEvent as RequestEvent);
			
			expect(context.variants).toEqual({
				'feature-a': 'variant-1',
				'feature-b': 'variant-2'
			});
		});

		it('should handle empty groups cookie', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify([]));
			
			const context = getUserContext(mockEvent as RequestEvent);
			
			expect(context.groups).toEqual([]);
		});

		it('should handle invalid variants JSON gracefully', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_variants', 'invalid-json');
			
			// Should throw since JSON.parse fails
			expect(() => getUserContext(mockEvent as RequestEvent)).toThrow();
		});

		it('should not set cookies (read-only)', () => {
			getUserContext(mockEvent as RequestEvent);
			
			// Temp ID should not be persisted
			expect(mockCookies.has('canary_user_id')).toBe(false);
		});
	});

	describe('ensureUserId', () => {
		it('should generate and persist user ID when not exists', () => {
			ensureUserId(mockEvent as RequestEvent);
			
			const userId = mockCookies.get('canary_user_id');
			expect(userId).toBeDefined();
			expect(userId).toContain('user_');
		});

		it('should not overwrite existing user ID', () => {
			mockCookies.set('canary_user_id', 'existing-user-123');
			
			ensureUserId(mockEvent as RequestEvent);
			
			expect(mockCookies.get('canary_user_id')).toBe('existing-user-123');
		});

		it('should return the user ID', () => {
			const userId = ensureUserId(mockEvent as RequestEvent);
			
			expect(userId).toBeDefined();
			expect(userId).toBe(mockCookies.get('canary_user_id'));
		});
	});

	describe('addUserToGroup', () => {
		it('should add user to group', () => {
			mockCookies.set('canary_user_id', 'user-123');
			
			const context = addUserToGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.groups).toContain('beta');
			expect(mockCookies.get('canary_groups')).toBe(JSON.stringify(['beta']));
		});

		it('should not duplicate groups', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['beta']));
			
			const context = addUserToGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.groups).toEqual(['beta']);
			expect(mockCookies.get('canary_groups')).toBe(JSON.stringify(['beta']));
		});

		it('should add to existing groups', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['internal']));
			
			const context = addUserToGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.groups).toContain('internal');
			expect(context.groups).toContain('beta');
			expect(mockCookies.get('canary_groups')).toBe(JSON.stringify(['internal', 'beta']));
		});

		it('should generate user ID if not exists', () => {
			addUserToGroup(mockEvent as RequestEvent, 'beta');
			
			const userId = mockCookies.get('canary_user_id');
			expect(userId).toBeDefined();
		});

		it('should preserve variants', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_variants', JSON.stringify({ 'feature-a': 'variant-1' }));
			
			const context = addUserToGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.variants).toEqual({ 'feature-a': 'variant-1' });
		});
	});

	describe('removeUserFromGroup', () => {
		it('should remove user from group', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['beta', 'internal']));
			
			const context = removeUserFromGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.groups).not.toContain('beta');
			expect(context.groups).toContain('internal');
			expect(mockCookies.get('canary_groups')).toBe(JSON.stringify(['internal']));
		});

		it('should handle removing non-existent group', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['internal']));
			
			const context = removeUserFromGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.groups).toEqual(['internal']);
		});

		it('should handle empty groups list', () => {
			mockCookies.set('canary_user_id', 'user-123');
			
			const context = removeUserFromGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.groups).toEqual([]);
		});

		it('should remove group cookie when no groups left', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['beta']));
			
			removeUserFromGroup(mockEvent as RequestEvent, 'beta');
			
			expect(mockCookies.get('canary_groups')).toBe(JSON.stringify([]));
		});

		it('should preserve variants', () => {
			mockCookies.set('canary_user_id', 'user-123');
			mockCookies.set('canary_groups', JSON.stringify(['beta']));
			mockCookies.set('canary_variants', JSON.stringify({ 'feature-a': 'variant-1' }));
			
			const context = removeUserFromGroup(mockEvent as RequestEvent, 'beta');
			
			expect(context.variants).toEqual({ 'feature-a': 'variant-1' });
		});
	});
});
