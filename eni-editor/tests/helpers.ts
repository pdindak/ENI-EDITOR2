export async function expectOk(res: any, t: number) {
	if (res.status() >= 200 && res.status() < 300) return;
	const body = await res.text().catch(() => '<no body>');
	throw new Error(`${t}: expected 2xx got ${res.status()} body=${body}`);
}
