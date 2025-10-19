import { expect, test } from '@playwright/test';

test.describe('Canary Feature Flags', () => {
	test('home page loads successfully', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('h1')).toContainText('Canary Demo');
	});

	test('basic feature flag is always visible', async ({ page }) => {
		await page.goto('/');
		
		// Section 1: new-dashboard feature (100% rollout)
		await expect(page.getByText('New Dashboard Enabled', { exact: false })).toBeVisible();
	});

	test('beta and internal toggle buttons exist', async ({ page }) => {
		await page.goto('/');
		
		// Verify both toggle buttons are present
		await expect(page.getByRole('button', { name: /beta/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /internal/i })).toBeVisible();
	});

	test('feature sections are present', async ({ page }) => {
		await page.goto('/');
		
		// Verify all main sections are present
		await expect(page.getByText('Basic Feature Flag')).toBeVisible();
		await expect(page.getByText('Percentage Rollout')).toBeVisible();
		await expect(page.getByRole('heading', { name: /User Groups/, level: 2 }).first()).toBeVisible();
		await expect(page.getByText('A/B Testing')).toBeVisible();
	});

	test('A/B test shows a variant', async ({ page }) => {
		await page.goto('/');
		
		// Should show A/B test section
		await expect(page.getByText('A/B Test Active')).toBeVisible();
		
		// Should show variant text
		await expect(page.getByText(/You're seeing:/)).toBeVisible();
	});

	test('page has all expected sections', async ({ page }) => {
		await page.goto('/');
		
		// Verify main sections
		await expect(page.locator('main')).toBeVisible();
		await expect(page.getByRole('heading', { name: /User Groups/ }).first()).toBeVisible();
		await expect(page.getByText('Test Scenarios')).toBeVisible();
		await expect(page.getByText('Documentation')).toBeVisible();
	});

	test('beta toggle unlocks features after page refresh', async ({ page }) => {
		await page.goto('/');
		
		// Click "Join beta" button
		const betaButton = page.getByRole('button', { name: /beta/i }).first();
		await betaButton.click();
		
		// Wait for command to complete
		await page.waitForTimeout(500);
		
		// Refresh page to see the new state
		await page.reload();
		
		// Now beta-checkout should be unlocked
		await expect(page.getByText('Beta Checkout Unlocked')).toBeVisible();
	});

	test('internal toggle unlocks experimental features after page refresh', async ({ page }) => {
		await page.goto('/');
		
		// Click "Internal Team" button
		const internalButton = page.getByRole('button', { name: /internal/i });
		await internalButton.click();
		
		// Wait for command to complete
		await page.waitForTimeout(500);
		
		// Refresh page to see the new state
		await page.reload();
		
		// Now experimental feature should be visible
		await expect(page.getByText('Experimental Feature Active')).toBeVisible();
	});
});
