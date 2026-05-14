import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
export function parseEnvFile(contents) {
    const values = {};
    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        const exportPrefix = "export ";
        const assignment = line.startsWith(exportPrefix)
            ? line.slice(exportPrefix.length).trim()
            : line;
        const equalsIndex = assignment.indexOf("=");
        if (equalsIndex <= 0)
            continue;
        const key = assignment.slice(0, equalsIndex).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
            continue;
        let value = assignment.slice(equalsIndex + 1).trim();
        const quote = value[0];
        if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
            value = value.slice(1, -1);
        }
        else {
            const commentIndex = value.search(/\s+#/);
            if (commentIndex >= 0) {
                value = value.slice(0, commentIndex).trim();
            }
        }
        values[key] = value;
    }
    return values;
}
export function loadEnvFile(path) {
    if (!existsSync(path))
        return [];
    const loaded = [];
    const values = parseEnvFile(readFileSync(path, "utf8"));
    for (const [key, value] of Object.entries(values)) {
        if (process.env[key] === undefined) {
            process.env[key] = value;
            loaded.push(key);
        }
    }
    return loaded;
}
export function candidateEnvFiles(cwd = process.cwd()) {
    return [
        resolve(cwd, ".env"),
        join(homedir(), ".codex-video-vision", ".env"),
    ];
}
export function loadEnvFiles(paths = candidateEnvFiles()) {
    const loaded = new Set();
    for (const path of paths) {
        for (const key of loadEnvFile(path)) {
            loaded.add(key);
        }
    }
    return [...loaded].sort();
}
