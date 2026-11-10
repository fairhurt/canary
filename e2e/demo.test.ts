import { expect, test, type Page } from '@playwright/test';

const flag = (page: Page, key: string) => page.getByTestId(`flag-${key}`);

/**
 * Flip a group switch and wait for it to take. The switch is server-rendered, so a
 * click can land before hydration has attached the handler: retry until it works.
 */
async function setGroup(page: Page, group: string, member: boolean) {
	const toggle = page.getByRole('switch', { name: group });

	await expect(async () => {
		if ((await toggle.getAttribute('aria-checked')) !== String(member)) {
			await toggle.click({ timeout: 1000 });
		}
		await expect(toggle).toHaveAttribute('aria-checked', String(member), { timeout: 2000 });
	}).toPass();
}

test.describe('Canary demo', () => {
	test('home page loads without errors', async ({ page }) => {
		const problems: string[] = [];
		page.on('pageerror', (error) => problems.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
		});

		await page.goto('/', { waitUntil: 'networkidle' });

		await expect(page.locator('h1')).toContainText('Flip features');
		expect(problems).toEqual([]);
	});

	test('all sections are present', async ({ page }) => {
		await page.goto('/');

		for (const id of ['basic', 'rollout', 'groups', 'ab', 'routes', 'start']) {
			await expect(page.locator(`section#${id} h2`)).toBeVisible();
		}
	});

	test('features are server-rendered', async ({ request }) => {
		const html = await (await request.get('/')).text();

		expect(html).toContain('New Dashboard Enabled');
		expect(html).toContain('Beta Checkout Locked');
		expect(html).toContain('Feature enabled with variant');
		expect(html).not.toContain('Experimental Feature Active');
	});

	test('new visitors get a persistent user ID', async ({ page, context }) => {
		await page.goto('/');

		const cookie = (await context.cookies()).find((c) => c.name === 'canary_user_id');
		expect(cookie?.value).toMatch(/^user_/);
		expect(cookie?.httpOnly).toBe(true);
		await expect(page.getByTestId('user-id')).toHaveAttribute('title', cookie!.value);
	});

	test('rollout and A/B variant stay the same across reloads', async ({ page }) => {
		const snapshot = async () => ({
			variant: await flag(page, 'ab-test-homepage').locator('.variant').textContent(),
			rollout: await flag(page, 'gradual-rollout').getAttribute('data-enabled'),
			verdict: await page.getByTestId('rollout-verdict').textContent()
		});

		await page.goto('/');
		const first = await snapshot();
		expect(['control', 'variant-a', 'variant-b']).toContain(first.variant);

		for (let i = 0; i < 3; i++) {
			await page.reload();
			expect(await snapshot()).toEqual(first);
		}
	});

	test('the flag board, variant tiles and Feature component agree', async ({ page }) => {
		await page.goto('/');

		const variant = (await flag(page, 'ab-test-homepage').locator('.variant').textContent())!;
		const hero = { control: 'classic hero', 'variant-a': 'blue hero', 'variant-b': 'violet hero' }[
			variant
		];

		await expect(page.getByTestId(`variant-${variant}`)).toContainText('you');
		await expect(page.getByText(`The ${hero}`)).toBeVisible();

		const inRollout = (await flag(page, 'gradual-rollout').getAttribute('data-enabled')) === 'true';
		await expect(page.getByText("You're in the rollout")).toBeVisible({ visible: inRollout });
	});

	test('the rollout playground follows the slider', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const verdict = page.getByTestId('rollout-verdict');
		const slider = page.getByRole('slider');

		await slider.fill('100');
		await expect(verdict).toContainText('IN');

		await slider.fill('0');
		await expect(verdict).toContainText('OUT');
	});

	test('joining beta unlocks the feature without a page refresh', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Beta Checkout Locked')).toBeVisible();
		await expect(flag(page, 'beta-checkout')).toHaveAttribute('data-enabled', 'false');

		await setGroup(page, 'beta', true);

		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();
		await expect(flag(page, 'beta-checkout')).toHaveAttribute('data-enabled', 'true');
		await expect(page.getByTestId('route-/checkout')).toContainText('/checkout-beta');

		// Membership is stored in a cookie, so it survives a reload
		await page.reload();
		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();

		await setGroup(page, 'beta', false);
		await expect(page.getByText('Beta Checkout Locked')).toBeVisible();
		await expect(page.getByTestId('route-/checkout')).toContainText('stays put');
	});

	test('joining internal unlocks a globally disabled feature', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Experimental Feature Active')).toBeHidden();

		await setGroup(page, 'internal', true);

		await expect(page.getByText('Experimental Feature Active')).toBeVisible();
		// internal is also one of the groups for beta-checkout
		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();
	});

	test('a new identity starts from scratch', async ({ page, context }) => {
		const userId = async () =>
			(await context.cookies()).find((c) => c.name === 'canary_user_id')?.value;

		await page.goto('/');
		await setGroup(page, 'beta', true);
		const before = await userId();

		await page.getByRole('button', { name: 'New identity' }).click();

		await expect(page.getByRole('switch', { name: 'beta' })).toHaveAttribute(
			'aria-checked',
			'false'
		);
		await expect(page.getByText('Beta Checkout Locked')).toBeVisible();
		expect(await userId()).not.toBe(before);
		await expect(page.getByTestId('user-id')).toHaveAttribute('title', (await userId())!);
	});

	test('debug panel shows the user context', async ({ page }) => {
		await page.goto('/');
		await setGroup(page, 'beta', true);

		await page.getByRole('button', { name: /Canary Debug/ }).click();

		await expect(page.locator('.debug-panel code')).toContainText('user_');
		await expect(page.locator('.debug-panel .badge')).toHaveText('beta');
	});
});

test.describe('route redirects', () => {
	test('/dashboard redirects to the enabled route', async ({ page }) => {
		await page.goto('/dashboard');

		await expect(page).toHaveURL('/dashboard-v2');
		await expect(page.getByRole('heading', { name: 'New Dashboard' })).toBeVisible();
	});

	test('group-only routes are closed to non-members', async ({ page }) => {
		await page.goto('/checkout-beta');
		await expect(page).toHaveURL('/checkout');

		await page.goto('/admin');
		await expect(page).toHaveURL('/');
	});

	test('beta members are sent to the beta checkout', async ({ page }) => {
		await page.goto('/');
		await setGroup(page, 'beta', true);

		await page.getByTestId('route-/checkout').getByRole('link').click();

		await expect(page).toHaveURL('/checkout-beta');
		await expect(page.getByRole('heading', { name: 'Beta Checkout' })).toBeVisible();
	});
});
