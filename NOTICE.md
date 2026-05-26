# Third-Party Notices

NextUpTV is released under the MIT License (see [LICENSE](./LICENSE)). It is built
on the following third-party software and external services, whose authors and
maintainers are gratefully acknowledged.

## Open Source Libraries

| Library | License | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org/) | MIT | React framework (App Router) |
| [React](https://react.dev/) | MIT | UI library |
| [Anthropic SDK for TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) | MIT | Claude API client |
| [Tailwind CSS](https://tailwindcss.com/) | MIT | Utility-first CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | MIT | React component patterns |
| [Radix UI](https://www.radix-ui.com/) | MIT | Accessible component primitives |
| [Zod](https://zod.dev/) | MIT | TypeScript-first schema validation |
| [React Hook Form](https://react-hook-form.com/) | MIT | Form state management |
| [Recharts](https://recharts.org/) | MIT | Charting components |
| [Lucide](https://lucide.dev/) | ISC | Icon set |
| [Sonner](https://sonner.emilkowal.ski/) | MIT | Toast notifications |
| [next-themes](https://github.com/pacocoursey/next-themes) | MIT | Theme switching |
| [Geist](https://vercel.com/font) | SIL OFL 1.1 | Typeface |

Full dependency list and versions are in [`package.json`](./package.json).
License text for each package is shipped inside its `node_modules` directory.

## External Services

This project relies on the following external APIs. Use of NextUpTV is subject
to each provider's terms of service.

- **Anthropic Claude API** — powers all show recommendations.
  See the [Anthropic Usage Policies](https://www.anthropic.com/legal/aup) and
  [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms).
- **TheTVDB API (v4)** — provides show metadata, season/episode data, poster
  artwork, cast information, and streaming-platform availability. Metadata is
  contributed by TheTVDB community.
  See the [TheTVDB API Terms](https://thetvdb.com/api-information) and
  [Site Terms of Use](https://thetvdb.com/terms-of-use).

If you fork or redistribute this project, please preserve this NOTICE file and
ensure compliance with each provider's terms.
