import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.dirname(scriptDirectory);
const vendorDirectory = path.join(repositoryDirectory, "Vendor", "DarkReader");

const sources = [
    {
        fileName: "dark-sites.config",
        url: "https://raw.githubusercontent.com/darkreader/darkreader/main/src/config/dark-sites.config",
    },
    {
        fileName: "detector-hints.config",
        url: "https://raw.githubusercontent.com/darkreader/darkreader/main/src/config/detector-hints.config",
    },
];

const downloads = [];
for (const source of sources) {
    const response = await fetch(source.url, {
        headers: { accept: "text/plain" },
    });
    if (!response.ok) {
        throw new Error(`Could not download ${source.url}: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    if (content.trim() === "" || content.includes("<html")) {
        throw new Error(`Downloaded ${source.url} did not look like a Dark Reader configuration file`);
    }

    downloads.push({ ...source, content: content.endsWith("\n") ? content : `${content}\n` });
}

for (const source of downloads) {
    const outputPath = path.join(vendorDirectory, source.fileName);
    await fs.writeFile(outputPath, source.content);
    console.log(`Imported ${source.url} -> ${path.relative(repositoryDirectory, outputPath)}`);
}
