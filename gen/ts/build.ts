"use strict";

type MDConfig = {
    title?: string | null,
    date?: string | null
};

type MDParseResult = {
    raw: string,
    title: string,
    published: Date
};

import fs from "fs";
import path from "path";
import showdown from "showdown";
import hljs from 'highlight.js';

const md2html = new showdown.Converter();
const regexes = {
    configBlock: /^\s*```json\s+(.*?)```\s*/is,
    isoDate: /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.{0,1})(\d{0,})(Z|([\-+])(\d{2})(?::{0,1})(\d{2}))?)?)?)?/,
    title: /^#\s+(.*)$/m,
    code: /<code class="(.*?)\s+language-\1">(.*?)<\/code>/gs
};

if (process.argv.length !== 4) {
    console.error("node build.js <source-dir> <out-dir>");
    process.exit(1);
}

const genRoot = path.dirname(path.dirname(process.argv[1]));

const params = {
    sourceDir: fs.realpathSync(path.normalize(path.join(process.cwd(), process.argv[2]))),
    destDir: fs.realpathSync(path.normalize(path.join(process.cwd(), process.argv[3]))),
    template: fs.readFileSync(path.join(genRoot, "template.html"), "utf8")
};

const files = fs.globSync(params.sourceDir + path.sep + "*.md");

console.log(files);

for (let file of files) {
    const outName = path.join(params.destDir, path.basename(file, ".md")) + ".html";
    const md = structurizeMD(fs.readFileSync(file, "utf8"));
    const html = highlightCode(md2html.makeHtml(md.raw));
    const content = params.template
        .replace("{MD}", html) //Add Markdown
        .replace("{TITLE}", md.title) //Set title
        .replace("{DATE}", md.published.toISOString().split('T')[0]) //Set date
        .replace("{DATEFULL}", md.published.toISOString()) //Set date
        .replace(/<!--.*-->\s*/g, ""); //Remove comments
    fs.writeFileSync(outName, content);
    console.log(outName);
}

function structurizeMD(md: string): MDParseResult {
    const json = md.match(regexes.configBlock);
    if (!json) {
        throw new Error("Markdown has no json config block");
    }
    md = md.replace(regexes.configBlock, "");
    const config = JSON.parse(json[1]) as MDConfig;
    if (!config.date || !config.date.match(regexes.isoDate)) {
        throw new Error("Invalid or missing publish date in markdown config. Expected format is ISO 8601");
    }
    if (!config.title) {
        const title = md.match(regexes.title);
        if (!title) {
            throw new Error("Markdown config does not specify a title, and no h1 level title element was found in the document either");
        }
        config.title = title[1];
    }
    return {
        raw: md,
        published: new Date(config.date),
        title: config.title
    };
}

function highlightCode(html: string) {
    return html.replaceAll(regexes.code, (value, lang, code) => {
        if (lang === "mermaid") {
            return value;
        }
        return hljs.highlight(code, { language: lang }).value;
    });
}