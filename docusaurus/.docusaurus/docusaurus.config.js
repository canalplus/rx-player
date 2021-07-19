export default {
  "title": "RxPlayer",
  "tagline": "a featureful DASH/Smooth HTML5 Video Player",
  "url": "https://your-docusaurus-test-site.com",
  "baseUrl": "/",
  "onBrokenLinks": "ignore",
  "onBrokenMarkdownLinks": "warn",
  "favicon": "img/favicon.ico",
  "organizationName": "canalplus",
  "projectName": "rx-player",
  "themeConfig": {
    "algolia": {
      "apiKey": "YOUR_API_KEY",
      "indexName": "YOUR_INDEX_NAME",
      "contextualSearch": true,
      "searchParameters": {},
      "appId": "BH4D9OD16A"
    },
    "navbar": {
      "title": "",
      "logo": {
        "alt": "rx-player-logo",
        "src": "img/logo.png"
      },
      "items": [
        {
          "to": "docs/tutorials/quick_start",
          "activeBasePath": "docs",
          "label": "Get Started",
          "position": "left",
          "activeBaseRegex": "docs/(?!api|architecture)"
        },
        {
          "to": "docs/api/player_options",
          "label": "API",
          "position": "left",
          "activeBaseRegex": "docs/api"
        },
        {
          "href": "https://developers.canal-plus.com/rx-player/",
          "label": "Demo",
          "position": "right"
        },
        {
          "to": "blog",
          "label": "Blog",
          "position": "right"
        },
        {
          "href": "https://github.com/canalplus/rx-player",
          "label": "GitHub",
          "position": "right"
        }
      ],
      "hideOnScroll": false
    },
    "footer": {
      "style": "dark",
      "links": [
        {
          "title": "Docs",
          "items": [
            {
              "label": "Quick Start",
              "to": "docs/tutorials/quick_start"
            },
            {
              "label": "Player options",
              "to": "docs/api/player_options"
            },
            {
              "label": "loadVideo method",
              "to": "docs/api/loadVideo"
            }
          ]
        },
        {
          "title": "Community",
          "items": [
            {
              "label": "Gitter",
              "href": "https://gitter.im/canalplus/rx-player"
            }
          ]
        },
        {
          "title": "More",
          "items": [
            {
              "label": "Blog",
              "to": "blog"
            },
            {
              "label": "Demo",
              "href": "https://developers.canal-plus.com/rx-player/"
            },
            {
              "label": "GitHub",
              "href": "https://github.com/canalplus/rx-player"
            }
          ]
        }
      ],
      "copyright": "Copyright © 2021 Canal+"
    },
    "colorMode": {
      "defaultMode": "light",
      "disableSwitch": false,
      "respectPrefersColorScheme": false,
      "switchConfig": {
        "darkIcon": "🌜",
        "darkIconStyle": {},
        "lightIcon": "🌞",
        "lightIconStyle": {}
      }
    },
    "docs": {
      "versionPersistence": "localStorage"
    },
    "metadatas": [],
    "prism": {
      "additionalLanguages": []
    },
    "hideableSidebar": false
  },
  "presets": [
    [
      "@docusaurus/preset-classic",
      {
        "docs": {
          "sidebarPath": "/home/prosset/Documents/Canal+/rx-player-c+/docusaurus/sidebars.js",
          "editUrl": "https://github.com/facebook/docusaurus/edit/master/website/"
        },
        "blog": {
          "showReadingTime": true,
          "editUrl": "https://github.com/facebook/docusaurus/edit/master/website/blog/"
        },
        "theme": {
          "customCss": "/home/prosset/Documents/Canal+/rx-player-c+/docusaurus/src/css/custom.css"
        }
      }
    ]
  ],
  "baseUrlIssueBanner": true,
  "i18n": {
    "defaultLocale": "en",
    "locales": [
      "en"
    ],
    "localeConfigs": {}
  },
  "onDuplicateRoutes": "warn",
  "customFields": {},
  "plugins": [],
  "themes": [],
  "titleDelimiter": "|",
  "noIndex": false
};