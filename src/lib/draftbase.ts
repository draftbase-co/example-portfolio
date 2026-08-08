import { createClient, type Entry } from "@draftbase/sdk";

const apiKey = import.meta.env.DRAFTBASE_API_KEY;
if (!apiKey) {
	throw new Error(
		"DRAFTBASE_API_KEY is not set. Copy .env.example to .env and add a delivery-scoped key.",
	);
}

// Runs only in Node, at build time. Astro exposes non-PUBLIC_ env vars to server code only,
// so the key is never inlined into anything the browser downloads.
const client = createClient({
	apiKey,
	baseUrl: import.meta.env.DRAFTBASE_API_URL ?? "https://api.draftbase.co",
	environment: import.meta.env.DRAFTBASE_ENVIRONMENT ?? "production",
	cacheTtlMs: 60_000,
});

/**
 * All published entries of one template, following cursor pagination to the end.
 * `templateId` is the template's key (e.g. "project"), not a database id.
 */
export async function getAll<Fields>(templateId: string): Promise<Entry<Fields>[]> {
	const all: Entry<Fields>[] = [];
	let after: string | undefined;
	do {
		// The SDK's option is named `contentTypeId`, but the API's query param is `templateId`.
		const page = await client.getEntries<Fields>({ templateId, after, limit: 100, include: 1 });
		all.push(...page.entries);
		after = page.nextCursor ?? undefined;
	} while (after);
	return all;
}

/** A `media` field resolved by `include` — or null when the field is empty. */
export function imageUrl(field: unknown): string | null {
	return (field as { url?: string | null } | null)?.url ?? null;
}

/** Prefixes a path with the configured `base`, so links work on a GitHub Pages project site. */
export function url(path = ""): string {
	return import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

export interface Project {
	title: string;
	slug: string;
	summary: string;
	body: string;
	cover?: { url?: string | null; altText?: string } | null;
	liveUrl?: string;
	year?: number;
	featured?: boolean;
}

export interface Profile {
	name: string;
	headline: string;
	bio: string;
	avatar?: { url?: string | null; altText?: string } | null;
	email?: string;
	githubUrl?: string;
	linkedinUrl?: string;
}
