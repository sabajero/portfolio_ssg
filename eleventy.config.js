import yaml from "js-yaml";

export default function (eleventyConfig) {
  // ── YAML support (required in Eleventy v3 — not built-in by default)
  eleventyConfig.addDataExtension("yaml,yml", (contents) =>
    yaml.load(contents)
  );

  // ── Passthrough: copy assets as-is into _site/
  eleventyConfig.addPassthroughCopy("src/assets");

  // ── Collections: all published projects, sorted by date descending
  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/_projects/*.md")
      .filter((item) => item.data.status !== "draft")
      .sort((a, b) => {
        // Sort by year frontmatter ascending (oldest → newest)
        const yearA = Number(a.data.year) || 0;
        const yearB = Number(b.data.year) || 0;
        if (yearA !== yearB) return yearA - yearB;
        // Same year: fall back to title alphabetically
        return (a.data.title || "").localeCompare(b.data.title || "");
      });
  });

  // ── Collections: featured projects only
  eleventyConfig.addCollection("featuredProjects", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/_projects/*.md")
      .filter((item) => item.data.featured && item.data.status !== "draft")
      .sort((a, b) => {
        if (a.data.order !== undefined && b.data.order !== undefined) {
          return a.data.order - b.data.order;
        }
        return b.date - a.date;
      });
  });

  // ── Filters
  eleventyConfig.addFilter("formatYear", (dateStr) => {
    return new Date(dateStr).getFullYear();
  });

  eleventyConfig.addFilter("date", (dateObj) => {
    // Basic YYYY-MM-DD formatter
    const d = new Date(dateObj);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  });

  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));

  // ── Global data directory (YAML files)
  // Eleventy reads _data/ automatically when in the input dir

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    // Use Nunjucks for .njk and .html template files
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
