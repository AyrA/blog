"use strict";

type MenuItem = {
    title: string,
    description: string,
    date: Date,
    file: string
};

type RenderResult = {
    htmlCode: string,
    fullPath: string
    menuItem: MenuItem
}

type MDConfig = {
    title?: string | null,
    desc?: string | null,
    date?: string | null,
    tags?: string[] | null
};

type MDParseResult = {
    raw: string,
    title: string,
    description?: string | null,
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
    docsTemplate: fs.readFileSync(path.join(genRoot, "template.html"), "utf8"),
    menuTemplate: fs.readFileSync(path.join(genRoot, "menu.html"), "utf8"),
    menuDest: "index.html"
};

const files = fs.globSync(params.sourceDir + path.sep + "*.md");
const render = renderFiles(files);
const menu = renderMenu(render.map(v => v.menuItem), params.menuTemplate);
fs.writeFileSync(path.join(params.destDir, params.menuDest), menu);
for (let blogItem of render) {
    fs.writeFileSync(blogItem.fullPath, blogItem.htmlCode);
}

function renderMenu(menuItems: MenuItem[], template: string) {
    let ret = "<ul>";
    for (let item of menuItems) {
        ret += htmlEncode
            `<li>
    <time datetime="${item.date.toISOString()}">${item.date.toISOString().split('T')[0]}</time>
    <a href="docs/${item.file}"><b>${item.title}</b></a><br />
    <i>${item.description}</i>
</li>`;
    }
    ret += "</ul>"
    return template.replace("{LIST}", ret);
}

function htmlEncode(template: TemplateStringsArray, ...params: string[]): string {
    params = params.map(v => v.replaceAll(">", "&gt;").replaceAll("<", "&lt;").replaceAll("'", "&apos;").replaceAll('"', "&quot;"));
    let ret = "";
    for (let i = 0; i < params.length; i++) {
        ret += template[i] + params[i];
    }
    ret += template[params.length];
    return ret;
}

function updateMenu(data: RenderResult[]) {
    for (let i = 0; i < data.length; i++) {
        const prev = data[i - 1];
        const item = data[i];
        const next = data[i + 1];
        const menuLinks = [];

        const menuItem = function (item: RenderResult) {
            return htmlEncode`<a href="${path.basename(item.fullPath)}" title="${item.menuItem.description}">${item.menuItem.title}</a>`;
        }

        if (prev) {
            menuLinks.push(menuItem(prev));
        }
        else {
            menuLinks.push("No newer entries");
        }
        menuLinks.push(htmlEncode`<a href="..">Menu</a>`);
        if (next) {
            menuLinks.push(menuItem(next));
        }
        else {
            menuLinks.push("No older entries");
        }
        item.htmlCode = item.htmlCode.replace("{MENU}", menuLinks.join(' | '));
    }
}

/**
 * Renders markdown into HTML
 * @param files Markdown file list
 * @returns Processed result
 */
function renderFiles(files: string[]): RenderResult[] {
    const ret = [] as RenderResult[];
    for (let file of files) {
        const outFileName = path.basename(file, ".md") + ".html";
        const outFullName = path.join(params.destDir, "docs", outFileName);
        console.log("processing", path.basename(file), "-->", outFileName);

        const md = structurizeMD(fs.readFileSync(file, "utf8"));
        const html = highlightCode(md2html.makeHtml(md.raw));
        const content = params.docsTemplate
            .replace("{MD}", html) //Add Markdown
            .replace("{TITLE}", md.title) //Set title
            .replace("{DATE}", md.published.toISOString().split('T')[0]) //Set date
            .replace("{DATEFULL}", md.published.toISOString()) //Set date
            .replace(/<!--.*-->\s*/g, ""); //Remove comments
        ret.push({
            fullPath: outFullName,
            htmlCode: content,
            menuItem: {
                date: md.published,
                title: md.title,
                description: md.description ?? "No description",
                file: outFileName
            }
        });
    }
    //Sort items in publish order, descending
    ret.sort((a, b) => b.menuItem.date.getTime() - a.menuItem.date.getTime());
    //Finalize the menu items
    updateMenu(ret);
    return ret;
}

/**
 * Extracts the metadata block from markdown, validates it, and returns the result
 * @param md Markdown code
 * @returns Markdown with metadata
 */
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
        title: config.title,
        description: config.desc
    };
}

/**
 * Highlights all code inside of <code> tags that declare a language
 * @param html Raw HTML document code
 * @returns HTML document with code sections highlighted
 */
function highlightCode(html: string) {
    return html.replaceAll(regexes.code, (value, lang, code) => {
        if (lang === "mermaid") {
            return value;
        }
        return hljs.highlight(code, { language: lang }).value;
    });
}