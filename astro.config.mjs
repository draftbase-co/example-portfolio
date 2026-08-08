import { defineConfig } from "astro/config";

// Static output (the default). Content is fetched from Draftbase at build time, so the
// API key never reaches the browser and the deployed site is plain HTML on GitHub Pages.
export default defineConfig({
	// SITE_URL/BASE_PATH let a fork deploy to its own GitHub Pages URL without editing
	// this file — `npm create draftbase` sets them as repo variables.
	site: process.env.SITE_URL ?? "https://demo-portfolio.draftbase.co",
	base: process.env.BASE_PATH || "/",
});
