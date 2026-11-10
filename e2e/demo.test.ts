import { expect, test, type Page } from '@playwright/test';

/**
 * Click a group toggle and wait for it to flip. The button is server-rendered, so a
 * click can land before hydration has attached the handler: retry until it takes.
 */
async function toggleGroup(page: Page, from: string, to: string) {
	await expect(async () => {
		await page.getByRole('button', { name: from }).click({ timeout: 1000 });
		await expect(page.getByRole('button', { name: to })).toBeVisible({ timeout: 2000 });
	}).toPass();
}

test.describe('Canary demo', () => {
	test('home page loads successfully', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toContainText('Canary Demo');
	});

	test('all sections are present', async ({ page }) => {
		await page.goto('/');

		for (const name of [
			/User Groups/,
			/Basic Feature Flag/,
			/Percentage Rollout/,
			/Group-Gated Feature/,
			/Disabled Feature Override/,
			/A\/B Testing/,
			/Route Redirects/,
			/Test Scenarios/
		]) {
			await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
		}
	});

	test('features are server-rendered', async ({ request }) => {
		const html = await (await request.get('/')).text();

		expect(html).toContain('New Dashboard Enabled');
		expect(html).toContain('Beta Checkout Locked');
		expect(html).toContain('A/B Test Active');
		expect(html).not.toContain('Experimental Feature Active');
	});

	test('new visitors get a persistent user ID', async ({ page, context }) => {
		await page.goto('/');

		const cookie = (await context.cookies()).find((c) => c.name === 'canary_user_id');
		expect(cookie?.value).toMatch(/^user_/);
		expect(cookie?.httpOnly).toBe(true);
	});

	test('rollout and A/B variant stay the same across reloads', async ({ page }) => {
		const snapshot = async () => ({
			variant: await page.getByText(/You're seeing:/).textContent(),
			inRollout: await page.getByText("You're in the rollout").isVisible()
		});

		await page.goto('/');
		await expect(page.getByText('A/B Test Active')).toBeVisible();
		const first = await snapshot();

		for (let i = 0; i < 3; i++) {
			await page.reload();
			await expect(page.getByText('A/B Test Active')).toBeVisible();
			expect(await snapshot()).toEqual(first);
		}
	});

	test('both ways of rendering variants agree', async ({ page }) => {
		await page.goto('/');

		const variant = (await page
			.getByText(/You're seeing:/)
			.locator('strong')
			.textContent())!;
		const label = { control: 'Control Group', 'variant-a': 'Variant A', 'variant-b': 'Variant B' }[
			variant
		];

		expect(label).toBeDefined();
		await expect(page.getByText(label!)).toBeVisible();
	});

	test('joining beta unlocks the feature without a page refresh', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Beta Checkout Locked')).toBeVisible();

		await toggleGroup(page, 'Join beta', 'Leave beta');

		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();

		// Membership is stored in a cookie, so it survives a reload
		await page.reload();
		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();

		await toggleGroup(page, 'Leave beta', 'Join beta');
		await expect(page.getByText('Beta Checkout Locked')).toBeVisible();
	});

	test('joining internal unlocks a globally disabled feature', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Experimental Feature Active')).toBeHidden();

		await toggleGroup(page, 'Internal Team', '✓ Internal Team');

		await expect(page.getByText('Experimental Feature Active')).toBeVisible();
		// internal is also one of the groups for beta-checkout
		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();
	});

	test('debug panel shows the user context', async ({ page }) => {
		await page.goto('/');
		await toggleGroup(page, 'Join beta', 'Leave beta');

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
		await toggleGroup(page, 'Join beta', 'Leave beta');

		await page.goto('/checkout');

		await expect(page).toHaveURL('/checkout-beta');
		await expect(page.getByRole('heading', { name: 'Beta Checkout' })).toBeVisible();
	});
});
