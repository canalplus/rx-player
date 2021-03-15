module.exports = {
  title: "RxPlayer",
  tagline: "a feature full DASH/Smooth HTML5 Video Player",
  url: "https://your-docusaurus-test-site.com",
  baseUrl: "/",
  onBrokenLinks: "ignore",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "canalplus", // Usually your GitHub org/user name.
  projectName: "rx-player", // Usually your repo name.
  themeConfig: {
    algolia: {
      apiKey: "YOUR_API_KEY",
      indexName: "YOUR_INDEX_NAME",

      // Optional: see doc section bellow
      contextualSearch: true,

      // Optional: Algolia search parameters
      searchParameters: {},

      //... other Algolia params
    },
    navbar: {
      title: "",
      logo: {
        alt: "rx-player-logo",
        src: "img/logo.png",
      },
      items: [
        {
          to: "docs/intro",
          activeBasePath: "docs",
          label: "Get Started",
          position: "left",
          activeBaseRegex: "docs/(?!api|architecture)",
        },
        {
          to: "docs/api/player_options",
          label: "API",
          position: "left",
          activeBaseRegex: "docs/api",
        },
        {
          href: "https://developers.canal-plus.com/rx-player/",
          label: "Demo",
          position: "right",
        },
        { to: "blog", label: "Blog", position: "right" },
        {
          href: "https://github.com/canalplus/rx-player",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Style Guide",
              to: "docs/",
            },
            {
              label: "Second Doc",
              to: "docs/doc2/",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Gitter",
              href: "https://gitter.im/canalplus/rx-player",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "blog",
            },
            {
              label: "Demo",
              href: "https://developers.canal-plus.com/rx-player/",
            },
            {
              label: "GitHub",
              href: "https://github.com/canalplus/rx-player",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Canal+`,
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl:
            "https://github.com/facebook/docusaurus/edit/master/website/",
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            "https://github.com/facebook/docusaurus/edit/master/website/blog/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
