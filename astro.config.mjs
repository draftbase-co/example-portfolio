import { defineConfig } from "astro/config";

// Static output (the default). Content is fetched from Draftbase at build time, so the
// API key never reaches the browser and the deployed site is plain HTML on GitHub Pages.
export default defineConfig({
	site: "https://draftbase-co.github.io",
	base: "/example-portfolio",
});
