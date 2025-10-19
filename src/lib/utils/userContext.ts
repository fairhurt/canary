import type { RequestEvent } from '@sveltejs/kit';
import type { UserContext } from '../types/index.js';
import { generateUserId } from './hash.js';

/**
 * Cookie names (can be customized via options)
 */
let userIdCookie = 'canary_user_id';
let groupsCookie = 'canary_groups';
let variantsCookie = 'canary_variants';

/**
 * Initialize cookie names
 */
export function initCookieNames(options?: {
	userIdCookie?: string;
	groupsCookie?: string;
	variantsCookie?: string;
}): void {
	if (options?.userIdCookie) userIdCookie = options.userIdCookie;
	if (options?.groupsCookie) groupsCookie = options.groupsCookie;
	if (options?.variantsCookie) variantsCookie = options.variantsCookie;
}

/**
 * Get user context from cookies (read-only)
 * Generates a temporary ID if no cookie exists (doesn't set it)
 * Use ensureUserId() in command functions to persist the ID
 */
export function getUserContext(event: RequestEvent): UserContext {
	const { cookies } = event;

	// Get user ID or generate temporary one
	// Note: temporary IDs won't persist across requests until a command is called
	const userId = cookies.get(userIdCookie) || generateUserId();

	// Get user groups
	const groupsStr = cookies.get(groupsCookie);
	const groups = groupsStr ? JSON.parse(groupsStr) : [];

	// Get variant assignments
	const variantsStr = cookies.get(variantsCookie);
	const variants = variantsStr ? JSON.parse(variantsStr) : {};

	return { userId, groups, variants };
}

/**
 * Ensure user ID cookie is set (call this from command functions only)
 */
export function ensureUserId(event: RequestEvent): string {
	const { cookies } = event;

	let userId = cookies.get(userIdCookie);

	if (!userId) {
		userId = generateUserId();
		cookies.set(userIdCookie, userId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});
	}

	return userId;
}

/**
 * Update user context in cookies
 */
export function setUserContext(event: RequestEvent, context: UserContext): void {
	const { cookies } = event;

	cookies.set(userIdCookie, context.userId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	cookies.set(groupsCookie, JSON.stringify(context.groups), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	cookies.set(variantsCookie, JSON.stringify(context.variants), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});
}

/**
 * Add user to a group
 */
export function addUserToGroup(event: RequestEvent, group: string): UserContext {
	const context = getUserContext(event);

	if (!context.groups.includes(group)) {
		context.groups.push(group);
		setUserContext(event, context);
	}

	return context;
}

/**
 * Remove user from a group
 */
export function removeUserFromGroup(event: RequestEvent, group: string): UserContext {
	const context = getUserContext(event);

	context.groups = context.groups.filter((g) => g !== group);
	setUserContext(event, context);

	return context;
}

/**
 * Check if user belongs to a group
 */
export function isUserInGroup(context: UserContext, group: string): boolean {
	return context.groups.includes(group);
}

/**
 * Assign a variant to a user
 */
export function assignVariant(
	event: RequestEvent,
	featureKey: string,
	variant: string
): UserContext {
	const context = getUserContext(event);

	context.variants[featureKey] = variant;
	setUserContext(event, context);

	return context;
}

/**
 * Get assigned variant for a feature
 */
export function getAssignedVariant(context: UserContext, featureKey: string): string | undefined {
	return context.variants[featureKey];
}
