/**
 * Creates this example's templates and a few published entries in your Draftbase org.
 *
 * Run locally only — it needs a MANAGEMENT-scoped key, which can write and delete content.
 * Never put that key in CI or in a hosting provider's environment.
 *
 *   cp .env.example .env   # add DRAFTBASE_MANAGEMENT_API_KEY
 *   npm run seed
 *
 * Safe to re-run: existing templates are left alone and entries are matched by title.
 */
const BASE_URL = process.env.DRAFTBASE_API_URL ?? "https://api.draftbase.co";
const API_KEY = process.env.DRAFTBASE_MANAGEMENT_API_KEY;
const ENV_ID = process.env.DRAFTBASE_ENVIRONMENT ?? "production";
const LOCALE = "en-US";

if (!API_KEY) {
	console.error("Set DRAFTBASE_MANAGEMENT_API_KEY in .env (see .env.example).");
	process.exit(1);
}

async function api(path, { method = "GET", body } = {}) {
	const res = await fetch(new URL(path, BASE_URL), {
		method,
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
	return res.status === 204 ? null : res.json();
}

/** A template's key is derived from its name ("Blog Post" -> "blogPost"), and is what
 *  entries and the delivery API refer to as `templateId`. */
async function ensureTemplate(template) {
	const existing = await api(`/templates?envId=${ENV_ID}`);
	const match = existing.find((t) => t._id === template.key);
	if (match) {
		console.log(`template ${template.key} already exists`);
		return match._id;
	}
	const { key, ...body } = template;
	const created = await api("/templates", { method: "POST", body: { ...body, envId: ENV_ID } });
	console.log(`template ${created._id ?? key} created`);
	return created._id ?? key;
}

/** Downloads a remote image and pushes it through Draftbase's presigned-upload flow. */
async function uploadImage(url, fileName, altText) {
	const file = await fetch(url);
	if (!file.ok) throw new Error(`could not download ${url}`);
	const contentType = file.headers.get("content-type") ?? "image/jpeg";
	const blob = await file.blob();

	const upload = await api("/media/upload-url", {
		method: "POST",
		body: { fileName, contentType, envId: ENV_ID },
	});
	const form = new FormData();
	for (const [name, value] of Object.entries(upload.fields)) form.append(name, value);
	form.append("file", blob, fileName);
	const put = await fetch(upload.url, { method: "POST", body: form });
	if (!put.ok) throw new Error(`storage upload failed: ${put.status} ${await put.text()}`);

	const { id } = await api("/media/confirm", {
		method: "POST",
		body: { storageKey: upload.storageKey, contentType, envId: ENV_ID, altText },
	});
	return id;
}

async function ensureEntry(templateId, titleField, fields, tags = []) {
	const list = await api(
		`/entries?envId=${ENV_ID}&templateId=${templateId}&limit=100`,
	);
	const match = list.items.find((e) => e.fields[titleField] === fields[titleField]);
	if (match) {
		console.log(`entry "${fields[titleField]}" already exists`);
		return match._id;
	}
	const { id } = await api("/entries", {
		method: "POST",
		body: { templateId, locale: LOCALE, envId: ENV_ID, fields, tags },
	});
	await api(`/entries/${id}/status`, { method: "PATCH", body: { status: "published" } });
	console.log(`entry "${fields[titleField]}" created and published`);
	return id;
}

const templates = [
	{
		key: "profile",
		name: "Profile",
		titleField: "name",
		fields: [
			{ key: "name", label: "Name", type: "text", required: true },
			{ key: "headline", label: "Headline", type: "text", required: true },
			{ key: "bio", label: "Bio", type: "richText" },
			{ key: "avatar", label: "Avatar", type: "media" },
			{ key: "email", label: "Email", type: "text" },
			{ key: "githubUrl", label: "GitHub URL", type: "text" },
			{ key: "linkedinUrl", label: "LinkedIn URL", type: "text" },
		],
	},
	{
		key: "project",
		name: "Project",
		titleField: "title",
		fields: [
			{ key: "title", label: "Title", type: "text", required: true },
			{ key: "slug", label: "Slug", type: "text", required: true, isSlug: true },
			{ key: "summary", label: "Summary", type: "text", multiline: true, maxLength: 200 },
			{ key: "body", label: "Body", type: "richText" },
			{ key: "cover", label: "Cover image", type: "media" },
			{ key: "liveUrl", label: "Live URL", type: "text" },
			{ key: "year", label: "Year", type: "number" },
			{ key: "featured", label: "Featured", type: "boolean" },
		],
	},
];

const projects = [
	{
		title: "Northwind Analytics",
		slug: "northwind-analytics",
		summary: "A reporting dashboard that turned a 40-tab spreadsheet into three screens.",
		year: 2025,
		featured: true,
		liveUrl: "https://example.com/northwind",
		image: "https://picsum.photos/seed/northwind/1200/675",
		body: `## The problem

Operations ran on a shared spreadsheet that took eleven minutes to open. Nobody trusted
the numbers, so everyone kept a private copy.

## What I built

A read-only dashboard backed by the warehouse, with three views: today, this week, and
anything that looks wrong. Everything else was cut.

## Result

Reporting time dropped from two days a month to zero. The spreadsheet was deleted.`,
	},
	{
		title: "Ledger CLI",
		slug: "ledger-cli",
		summary: "A single-binary command-line tool for reconciling invoices against bank exports.",
		year: 2024,
		featured: true,
		image: "https://picsum.photos/seed/ledger/1200/675",
		body: `## Why a CLI

The people doing reconciliation already lived in a terminal. A web app would have been a
detour through a browser for a job that is really just diffing two files.

## Design notes

One command, two arguments, and an exit code that means something in CI.`,
	},
	{
		title: "Field Notes",
		slug: "field-notes",
		summary: "An offline-first note app for site inspectors working without signal.",
		year: 2023,
		image: "https://picsum.photos/seed/fieldnotes/1200/675",
		body: `## Constraints

Inspectors work in basements and rural sites. The app had to assume no network for hours
at a time, then sync without conflicts when a signal came back.

## Approach

Local-first storage with a last-writer-wins merge, plus a visible sync status so nobody
has to guess whether their morning's work made it home.`,
	},
];

async function main() {
	for (const template of templates) await ensureTemplate(template);

	const avatar = await uploadImage(
		"https://picsum.photos/seed/avatar/400/400",
		"avatar.jpg",
		"Portrait of Alex Rivera",
	);
	await ensureEntry("profile", "name", {
		name: "Alex Rivera",
		headline: "Product engineer — I build the boring version first.",
		avatar,
		email: "hello@example.com",
		githubUrl: "https://github.com/",
		bio: `I design and ship small, durable software. Most of my work is deleting things that
turned out not to be load-bearing.

Currently freelancing. Available for short engagements.`,
	});

	for (const { image, ...project } of projects) {
		const cover = await uploadImage(
			image,
			`${project.slug}.jpg`,
			`Cover image for ${project.title}`,
		);
		await ensureEntry("project", "title", { ...project, cover });
	}

	console.log("\nSeed complete. Run `npm run dev`.");
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
