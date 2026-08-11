# Third-party notices

The source repository does not redistribute font files, images, or other binary assets. CSS font stacks only reference fonts already installed on the user's system. Font files added in the future must carry a license that permits the intended web, document, and PDF embedding uses.

The project uses the following direct npm dependencies:

| Package | License |
| --- | --- |
| `@codemirror/lang-json` | MIT |
| `@codemirror/theme-one-dark` | MIT |
| `codemirror` | MIT |
| `html2canvas` | MIT |
| `i18next` | MIT |
| `lucide` | ISC |
| `puppeteer-core` | Apache-2.0 |
| `sortablejs` | MIT |
| `vite` | MIT |
| `vite-plugin-singlefile` | MIT |

Transitive dependencies retain the licenses distributed with their respective packages. Production builds automatically collect the exact license files for all bundled runtime dependencies and embed them in the generated single-file HTML. A build fails if a runtime package has no readable license file, preventing an artifact from being published without its notices.

## Lucide and Feather icons

The project imports Lucide icons and includes several Lucide/Feather-compatible SVG paths directly in `src/renderer.js`. The applicable ISC notice is reproduced in full:

> ISC License
>
> Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
