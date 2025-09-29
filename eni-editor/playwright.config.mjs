/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	testDir: './tests',
	retries: 1,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080',
		headless: true
	},
	projects: []
};

export default config;
