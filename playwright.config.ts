import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'bun run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	},
	testDir: 'e2e',
	use: {
		baseURL: 'http://localhost:5173'
	}
});
