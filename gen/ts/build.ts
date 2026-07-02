"use strict";

import fs from "node:fs";
import path from "node:path";
import { getGlobalParams, renderFeed, renderFiles, renderMenu } from "./generator";

if (process.argv.length !== 4) {
    console.error("node build.js <source-dir> <out-dir>");
    process.exit(1);
}

/** Global parameters that are passed into every relevant function */
const globalParams = getGlobalParams();

/** Render result of individual markdown files */
const render = renderFiles(globalParams);

/** Result of generating the menu from a previous render */
const menu = renderMenu(render.map(v => v.menuItem), globalParams);
fs.writeFileSync(path.join(globalParams.dirs.dest, globalParams.outFiles.menu), menu);

if (globalParams.config.rss.enabled) {
    /** RSS feed XML data */
    const feed = renderFeed(render.map(v => v.menuItem), globalParams);
    fs.writeFileSync(path.join(globalParams.dirs.dest, globalParams.outFiles.feed), feed);
}
for (let blogItem of render) {
    fs.writeFileSync(blogItem.fullPath, blogItem.htmlCode);
    fs.utimesSync(blogItem.fullPath, blogItem.menuItem.date, blogItem.menuItem.date);
}
