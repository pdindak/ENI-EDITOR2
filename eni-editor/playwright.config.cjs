/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	testDir: './tests',
	testMatch: '**/*.{spec,test}.{js,jsx,ts,tsx,mjs,cjs}',
	retries: 1,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080',
		headless: true
	},
	projects: [
		{ name: 'api' }
	]
};

module.exports = config;
