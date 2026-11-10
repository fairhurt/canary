import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { UserContext } from '../types/index.js';
import { generateUserId } from './hash.js';

const DEFAULT_COOKIE_NAMES = {
	userIdCookie: 'canary_user_id',
	groupsCookie: 'canary_groups',
	variantsCookie: 'canary_variants'
};

/**
 * Cookie names (can be customized via options)
 */
let cookieNames = { ...DEFAULT_COOKIE_NAMES };

const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 60 * 60 * 24 * 365 // 1 year
} as const;

/**
 * Temporary IDs for requests that arrive without a user ID cookie, keyed by the
 * underlying `Request` so that every check during one request sees the same ID
 */
const temporaryIds = new WeakMap<object, string>();

/**
 * Initialize cookie names. Names that are not provided fall back to the defaults
 */
export function initCookieNames(options?: {
	userIdCookie?: string;
	groupsCookie?: string;
	variantsCookie?: string;
}): void {
	cookieNames = {
		userIdCookie: options?.userIdCookie || DEFAULT_COOKIE_NAMES.userIdCookie,
		groupsCookie: options?.groupsCookie || DEFAULT_COOKIE_NAMES.groupsCookie,
		variantsCookie: options?.variantsCookie || DEFAULT_COOKIE_NAMES.variantsCookie
	};
}

/**
 * Parse a JSON cookie, returning `undefined` if it is missing or malformed.
 * Cookies are user-controlled, so they must never be able to crash a request
 */
function readJsonCookie(cookies: Cookies, name: string): unknown {
	const raw = cookies.get(name);
	if (!raw) return undefined;

	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

function readGroups(cookies: Cookies): string[] {
	const value = readJsonCookie(cookies, cookieNames.groupsCookie);
	if (!Array.isArray(value)) return [];

	return [...new Set(value.filter((group): group is string => typeof group === 'string'))];
}

function readVariants(cookies: Cookies): Record<string, string> {
	const value = readJsonCookie(cookies, cookieNames.variantsCookie);
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	const variants: Record<string, string> = {};
	for (const [key, variant] of Object.entries(value)) {
		if (typeof variant === 'string') variants[key] = variant;
	}
	return variants;
}

/**
 * Get user context from cookies (read-only)
 *
 * If no user ID cookie exists, a temporary ID is generated. It is stable for the
 * duration of the request but is not persisted: use `handleFeatureRouting` in
 * `hooks.server.ts` (or call `ensureUserId()` wherever cookies can be set) so that
 * visitors keep the same ID, and therefore the same rollout and variant, across requests
 */
export function getUserContext(event: RequestEvent): UserContext {
	const { cookies } = event;

	let userId = cookies.get(cookieNames.userIdCookie);

	if (!userId) {
		// Remote functions receive a derived copy of the event, but the `Request` is shared
		const key = event.request ?? event;
		userId = temporaryIds.get(key);
		if (!userId) {
			userId = generateUserId();
			temporaryIds.set(key, userId);
		}
	}

	return { userId, groups: readGroups(cookies), variants: readVariants(cookies) };
}

/**
 * Ensure user ID cookie is set. Cookies cannot be set from remote `query` functions,
 * so call this from hooks, commands, form actions or endpoints
 */
export function ensureUserId(event: RequestEvent): string {
	const { cookies } = event;

	let userId = cookies.get(cookieNames.userIdCookie);

	if (!userId) {
		// Reuse the temporary ID so checks made earlier in this request stay valid
		userId = getUserContext(event).userId;
		cookies.set(cookieNames.userIdCookie, userId, COOKIE_OPTIONS);
	}

	return userId;
}

/**
 * Update user context in cookies
 */
export function setUserContext(event: RequestEvent, context: UserContext): void {
	const { cookies } = event;

	cookies.set(cookieNames.userIdCookie, context.userId, COOKIE_OPTIONS);
	cookies.set(cookieNames.groupsCookie, JSON.stringify(context.groups), COOKIE_OPTIONS);
	cookies.set(cookieNames.variantsCookie, JSON.stringify(context.variants), COOKIE_OPTIONS);
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

	if (context.groups.includes(group)) {
		context.groups = context.groups.filter((g) => g !== group);
		setUserContext(event, context);
	}

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
