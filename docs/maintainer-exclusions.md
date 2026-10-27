# Maintaining Nightshift exclusions

Nightshift has four independent sources:

- Dark Reader: the pinned upstream patterns in `Vendor/DarkReader/dark-sites.config`.
- Nightshift: maintainer-reviewed public hosts in `Config/manual-dark-sites.config`, shipped with app updates.
- Auto-detected: a known site-specific theme selector observed on that user's last visit. The content script rechecks the current page; arbitrary dark colors and images never trigger detection.
- User manual: `disabledSites`, saved on that Mac and shared across its Safari profiles.

Manual exclusions always win. Explicitly enabling a site bypasses bundled lists and detection; settings also lets the user restore automatic rules. Google Docs/Sheets retain their dedicated rendering treatment unless manually excluded. Bundled-list matches are no longer written into the detection cache. Legacy bundled-list cache entries are hidden from the detected section and cleaned when their sites are visited.

## Personal MacBook → master list

This is an explicit manual workflow. There is no maintainer account, machine-name check, upload endpoint, background submission, or remote list-write permission in the extension. The Mac mini's exclusions and App Store users' preferences cannot automatically become master entries.

1. On the **personal MacBook**, open the Nightshift toolbar popup and click the **settings icon** at the top right.
2. Under **Your manual exclusions**, expand **Export manual exclusions** and click **Copy public exclusions**. If clipboard access is unavailable, select and copy the text shown. Only manual public hostnames are exported. Ports, URL paths, credentials, local names, and all IP literals are omitted; local exclusions remain in the user's settings.
3. Paste that text into this chat for an explicit maintainer update, or save it as a UTF-8 text file and transfer it to the repository machine. Keep the export separate from any other user's export. Nothing uploads when you copy.
4. Preview from the repository:

   ```sh
   node Scripts/import-maintainer-exclusions.mjs --file /path/to/personal-exclusions.txt
   ```

5. Review the additions, then apply:

   ```sh
   node Scripts/import-maintainer-exclusions.mjs --file /path/to/personal-exclusions.txt --apply
   ```

The importer accepts one host/URL per line, a JSON array, or a JSON settings object with `disabledSites`. It ignores `autoDisabledSites` and `enabledSites`. Escaped dots and trailing backslashes from pasted lists are accepted. It preserves exact public subdomains, removes ports and duplicates, omits local/reserved namespaces and every IP address, and adds only previously unseen hosts. Existing master entries are never removed by import. Applying regenerates both bundled registries; repeating an import is safe.

6. Review the config/generated diff, run `make test`, `npm run check:theme-engine`, and the deterministic WebKit suite, bump versions, and package the next update. Master additions reach other installations through a new app build, not a live remote feed.

The October 27, 2026 seed includes all 22 public hosts supplied from the personal MacBook (21 additions; `tasks.google.com` was already present). The local `192.168.50.249:8000` exclusion was deliberately omitted. A host can appear in both Dark Reader and Nightshift lists; those sources remain separate.
