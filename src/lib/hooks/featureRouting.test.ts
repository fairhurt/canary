import { describe, it, expect, beforeEach } from 'vitest';
import { isRedirect, type RequestEvent } from '@sveltejs/kit';
import { handleFeatureRouting } from './featureRouting.js';
import { initConfigLoader } from '../utils/configLoader.js';

function createEvent(pathname: string, cookies: Record<string, string> = {}) {
	const jar = new Map(Object.entries(cookies));

	const event = {
		url: new URL(`http://localhost${pathname}`),
		request: new Request(`http://localhost${pathname}`),
		cookies: {
			get: (name: string) => jar.get(name),
			set: (name: string, value: string) => {
				jar.set(name, value);
			}
		}
	} as unknown as RequestEvent;

	return { event, jar };
}

/** Runs the hook and returns where it redirected to, or `null` if the request was resolved */
async function run(pathname: string, cookies?: Record<string, string>) {
	const { event, jar } = createEvent(pathname, cookies);

	try {
		await handleFeatureRouting({ event, resolve: async () => new Response('ok') });
		return { location: null, jar };
	} catch (error) {
		if (isRedirect(error)) return { location: error.location, status: error.status, jar };
		throw error;
	}
}

const beta = { canary_user_id: 'user-1', canary_groups: JSON.stringify(['beta']) };

describe('handleFeatureRouting', () => {
	beforeEach(() => {
		initConfigLoader({
			config: {
				features: {
					'new-dashboard': { enabled: true },
					'old-reports': { enabled: false },
					'internal-tools': { enabled: false, userGroups: ['internal'] }
				},
				routes: {
					'/dashboard': {
						feature: 'new-dashboard',
						enabled: '/dashboard-v2',
						disabled: '/dashboard-v1'
					},
					'/reports': { feature: 'old-reports', disabled: '/' },
					'/tools': { feature: 'internal-tools', disabled: '/' },
					'/checkout': { beta: '/checkout-beta' },
					'/checkout-beta': { requiresGroup: 'beta', disabled: '/checkout' },
					'/admin': { requiresGroup: 'internal' },
					'/': { requiresGroup: 'beta' }
				}
			}
		});
	});

	it('should resolve routes that have no routing config', async () => {
		expect((await run('/about')).location).toBeNull();
	});

	it('should persist a user ID for new visitors', async () => {
		const { jar } = await run('/about');

		expect(jar.get('canary_user_id')).toMatch(/^user_/);
	});

	it('should keep an existing user ID', async () => {
		const { jar } = await run('/about', { canary_user_id: 'existing' });

		expect(jar.get('canary_user_id')).toBe('existing');
	});

	it('should redirect to the enabled route when the feature is on', async () => {
		const result = await run('/dashboard');

		expect(result.location).toBe('/dashboard-v2');
		expect(result.status).toBe(307);
	});

	it('should redirect to the disabled route when the feature is off', async () => {
		expect((await run('/reports')).location).toBe('/');
	});

	it('should match routes with a trailing slash', async () => {
		expect((await run('/dashboard/')).location).toBe('/dashboard-v2');
	});

	it('should use the same group rules as feature checks', async () => {
		const internal = { canary_groups: JSON.stringify(['internal']) };

		// Disabled, but internal members still get the feature
		expect((await run('/tools', internal)).location).toBeNull();
		expect((await run('/tools')).location).toBe('/');
	});

	it('should send group members to their group route', async () => {
		expect((await run('/checkout', beta)).location).toBe('/checkout-beta');
		expect((await run('/checkout')).location).toBeNull();
	});

	it('should keep non-members away from a group-only route', async () => {
		expect((await run('/checkout-beta')).location).toBe('/checkout');
		expect((await run('/checkout-beta', beta)).location).toBeNull();
	});

	it('should send non-members home when there is no disabled route', async () => {
		expect((await run('/admin')).location).toBe('/');
	});

	it('should not redirect a route to itself', async () => {
		expect((await run('/')).location).toBeNull();
	});

	it('should not treat option names as groups', async () => {
		const sneaky = { canary_groups: JSON.stringify(['enabled', 'disabled', 'feature']) };

		// `disabled: "/dashboard-v1"` must not be picked up as a route for a group called "disabled"
		expect((await run('/dashboard', sneaky)).location).toBe('/dashboard-v2');
	});

	it('should survive malformed cookies', async () => {
		expect((await run('/checkout', { canary_groups: '{not json' })).location).toBeNull();
	});
});
