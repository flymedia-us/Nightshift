# Third-party notices

## Dark Reader compatibility data

Nightshift vendors complete snapshots of the following Dark Reader configuration
files and generates its runtime registry from them:

- <https://github.com/darkreader/darkreader/blob/main/src/config/dark-sites.config>
- <https://github.com/darkreader/darkreader/blob/main/src/config/detector-hints.config>

The source snapshots are stored in `Vendor/DarkReader/`; run
`npm run update:dark-reader` to import the latest versions and regenerate the
runtime registry. Developer-owned additions are kept separately in
`Config/manual-dark-sites.config` and are not represented as Dark Reader data.
The generated runtime registry is stored in
`Nightshift Extension/Resources/known-dark-sites.js`. Nightshift uses its own
small matcher and does not ship Dark Reader's parser or runtime service. The
snapshot was reviewed on 2026-09-22; run `npm run generate:dark-sites` after
updating either source file.

Dark Reader is distributed under the MIT License:

```text
MIT License

Copyright (c) 2026 Dark Reader Ltd.
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
