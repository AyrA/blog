"use strict";

import fs from "node:fs";
import path from "node:path";
import { getGlobalParams, renderFeed, renderFiles, renderMenu } from "./generator";

if (process.argv.length !== 4) {
    console.error("node build.js <source-dir> <out-dir>");
    process.exit(1);
}
/*
    The process is as follows:
    1. Render individual files
    2. Generate main menu file
    3. (Optional) Generate XML feed
    4. Write all files
*/
console.log("Static site generator");

/** Global parameters that are passed into every relevant function */
const globalParams = getGlobalParams();

//1. Render items
console.log("Processing markdown files");
const render = renderFiles(globalParams);

//2. Menu
console.log("Generating menu file");
const menu = renderMenu(render.map(v => v.menuItem), globalParams);

//3. XML feed
console.log("Generating XML feed")
const feed = renderFeed(render.map(v => v.menuItem), globalParams);

//4. Write all files
console.log("Writing files");
fs.writeFileSync(path.join(globalParams.dirs.dest, globalParams.outFiles.menu), menu);
if (feed) {
    fs.writeFileSync(path.join(globalParams.dirs.dest, globalParams.outFiles.feed), feed);
}
for (let blogItem of render) {
    fs.writeFileSync(blogItem.fullPath, blogItem.htmlCode);
    fs.utimesSync(blogItem.fullPath, blogItem.menuItem.date, blogItem.menuItem.date);
}
console.log("Done");