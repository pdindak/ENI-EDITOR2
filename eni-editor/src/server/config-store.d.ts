declare module '@/server/config-store' {
	export function parseConfigText(text: string): Record<string, string>;
	export function generateConfigText(entries: Record<string, string>): string;
	export function getAllConfig(): Record<string, string>;
	export function setConfigEntries(entries: Record<string, string>): void;
}
