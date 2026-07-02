import fs from "node:fs";
import path from "node:path";
import showdown from "showdown";
import hljs from 'highlight.js';
import json5 from 'json5';
import regexes from "./regexes";

/** Path to the "gen" folder */
const genRoot = path.dirname(path.dirname(process.argv[1]));

/** Extracts global parameters based on arguments and config file */
export function getGlobalParams(): GlobalParams {
    const config = json5.parse(fs.readFileSync(path.join(genRoot, "config.json5"), "utf8")) as BuildConfig;

    /** Global parameters that are passed into every relevant function */
    const params = {
        config: config,
        dirs: {
            source: fs.realpathSync(path.normalize(path.join(process.cwd(), process.argv[2]))),
            dest: fs.realpathSync(path.normalize(path.join(process.cwd(), process.argv[3])))
        },
        templates: {
            docs: fs.readFileSync(path.join(genRoot, "templates", "blogentry.html"), "utf8"),
            menu: fs.readFileSync(path.join(genRoot, "templates", "menu.html"), "utf8"),
            feed: config.rss.enabled ? fs.readFileSync(path.join(genRoot, "templates", "rss.xml"), "utf8") : "",
            feedEntry: config.rss.enabled ? fs.readFileSync(path.join(genRoot, "templates", "rss-entry.xml"), "utf8") : "",
        },
        outFiles: {
            menu: "index.html",
            feed: "feed.xml"
        }
    } as GlobalParams;
    return params;
}

/**
 * Generates RSS feed XML for the given menu items
 * @param menuItems Menu items to add to RSS feed
 * @param params Global params
 * @returns RSS feed XML
 */
export function renderFeed(menuItems: MenuItem[], params: GlobalParams) {
    const entries = [] as string[];
    for (let item of menuItems) {
        entries.push(params.templates.feedEntry
            .replaceAll("{FILENAME}", htmlEncode(path.basename(item.file)))
            .replaceAll("{DATE}", htmlEncode(shortIsoDate(item.date)))
            .replaceAll("{DATENUM}", String(Math.floor(item.date.getTime() / 1000)))
            .replaceAll("{TITLE}", htmlEncode(item.title))
            .replaceAll("{DESC}", htmlEncode(item.description))
            .replaceAll("{ROOT_URL}", htmlEncode(params.config.url))
            .replaceAll("{AUTHOR.NAME}", item.author.name)
            .replaceAll("{AUTHOR.URL}", item.author.url));
    }
    return params.templates.feed.
        replace("{ENTRIES}", entries.join("")).
        replace("{LASTITEM}", shortIsoDate(menuItems[0].date)).
        replaceAll("{AUTHOR.NAME}", params.config.rss.author.name).
        replaceAll("{AUTHOR.URL}", params.config.rss.author.url).
        replaceAll("{ROOT_URL}", htmlEncode(params.config.url));
}

/**
 * Renders a main menu into the given template
 * @param menuItems Menu items to render
 * @param params Global params
 * @returns Rendered template file
 */
export function renderMenu(menuItems: MenuItem[], params: GlobalParams) {
    let ret = "<ul>";
    for (let item of menuItems) {
        ret += htmlEncode
            `<li>
    <time datetime="${shortIsoDate(item.date)}">${item.date.toISOString().split('T')[0]}</time>
    <a href="docs/${item.file}"><b>${item.title}</b></a><br />
    <i>${item.description}</i>
</li>`;
    }
    ret += "</ul>"
    ret = params.templates.menu
        .replaceAll("{TITLE}", htmlEncode(params.config.title))
        .replaceAll("{DESC}", htmlEncode(params.config.desc))
        .replaceAll("{AUTHOR.NAME}", htmlEncode(params.config.rss.author?.name ?? ""))
        .replaceAll("{AUTHOR.URL}", htmlEncode(params.config.rss.author?.url ?? ""))
        .replace("{LIST}", ret)
        .replace("{FEED}", params.config.rss.enabled ? htmlEncode`<link href="./feed.xml" type="application/atom+xml" rel="alternate" title="${params.config.title}" />` : "");
    return stripComments(ret);
}

/**
 * Encodes values from a template literal to be HTML safe
 * @param template HTML template string
 * @param params Values to HTML encode
 * @returns HTML encoded string
 */
function htmlEncode(template: TemplateStringsArray | string, ...params: string[]): string {
    const encode = (v: string) => v.replaceAll(">", "&gt;").replaceAll("<", "&lt;").replaceAll("'", "&apos;").replaceAll('"', "&quot;");
    if (typeof (template) === "string") {
        return encode(template);
    }
    let ret = "";
    for (let i = 0; i < params.length; i++) {
        ret += template[i] + encode(params[i]);
    }
    ret += template[params.length];
    return ret;
}

/**
 * Creates the navigation links on the documents
 * @param data Result from a call to renderFiles
 */
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
 * @param params Global parameters
 * @returns Processed result
 */
export function renderFiles(params: GlobalParams): RenderResult[] {
    const files = fs.globSync(params.dirs.source + path.sep + "*.md");
    if (files.length === 0) {
        throw new Error(`docs folder "${params.dirs.source}" does not contain any markdown files`);
    }

    const md2html = new showdown.Converter();
    const ret = [] as RenderResult[];
    for (let file of files) {
        const outFileName = path.basename(file, ".md") + ".html";
        const outFullName = path.join(params.dirs.dest, "docs", outFileName);
        console.log("processing", path.basename(file), "-->", outFileName);

        const md = structurizeMD(fs.readFileSync(file, "utf8"), params);
        if (!md.published) {
            md.published = fs.statSync(file).mtime;
        }
        const html = highlightCode(md2html.makeHtml(md.raw));
        const content = params.templates.docs
            .replace("{MD}", html) //Add Markdown
            .replaceAll("{TITLE}", htmlEncode(md.title)) //Set title
            .replaceAll("{DESC}", htmlEncode(md.description ?? "")) //Set description
            .replaceAll("{AUTHOR.NAME}", htmlEncode(md.author.name)) //Set author name
            .replaceAll("{AUTHOR.URL}", htmlEncode(md.author.url)) //Set author url
            .replace("{DATE}", htmlEncode(md.published.toISOString().split('T')[0])) //Set date
            .replace("{DATEFULL}", htmlEncode(shortIsoDate(md.published))); //Set date
        ret.push({
            fullPath: outFullName,
            htmlCode: stripComments(content),
            menuItem: {
                date: md.published,
                title: md.title,
                description: md.description ?? "No description",
                file: outFileName,
                author: md.author
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
 * @param params Global parameters
 * @returns Markdown with metadata
 */
function structurizeMD(md: string, params: GlobalParams): MDParseResult {
    const json = md.match(regexes.configBlock);
    if (!json) {
        throw new Error("Markdown has no json config block");
    }
    md = md.replace(regexes.configBlock, "");
    const config = json5.parse(json[1]) as MDConfig;
    if (!config.date || (config.date !== "auto" && !config.date.match(regexes.isoDate))) {
        throw new Error("Invalid or missing publish date in markdown config. Expected format is ISO 8601 or the string 'auto'");
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
        published: config.date === "auto" ? null : new Date(config.date),
        title: config.title,
        description: config.desc,
        author: config.author ?? params.config.rss.author
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

/**
 * Renders a date item as ISO 8601 date string without milliseconds
 * @param dt Date instance
 * @returns ISO 8601 date string without millisecond component
 */
function shortIsoDate(dt: Date) {
    return dt.toISOString().replace(/\.\d+/, "");
}

/**
 * Removes all comments from an HTML string
 * @param html Raw HTML
 * @returns HTML without comments
 */
function stripComments(html: string) {
    return html.replaceAll(regexes.htmlComment, "");
}
