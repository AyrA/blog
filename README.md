# Blog

A static site generator for markdown files written from scratch.

_I don't recommend you use this because I wrote it solely for my own purposes_

## Features

- Output works with any static webserver, no serverside scripting or config needed
- Support for code highlighting (performed at build time)
- Support for mermaid diagrams (rendered at runtime)

See the example file in the docs folder for a demo

## Folder structure

- dist: Folder with output files. Will be automatically created by the generator
- docs: Folder to put your markdown files
- files: Folder for files you may want to link to from your markdown (images for example)
- gen: Folder with generator script and templates
- static: Folder with static assets used by the templates

## Installation

1. Clone
2. Remove ".dist" extension from `gen\config.json5.dist`
3. Edit the config json and fill in appropriate values
4. Run `build.bat`
5. Observe result in "dist" folder

## Dependencies

Note: This is only relevant for document generation.
The generated output itself is free of any dependencies and runs as-is on any static web server

I mainly use Windows, so this depends on Windows to run the `build.bat` file,
but this is trivial to convert this to a shell script for linux
because all it does is create a few directories, installs packages, and then runs the generator itself.

If you insist on doing it on another OS:

1. Create folders "docs" and "files"
2. Run `npm ci` from within the "gen" folder
3. Run `tsc` from within the "gen" folder

### Required dependencies

_These must be installed manually by you_

- nodeJS or other compatible engine to install NPM modules and run the generator script
- typescript to build the generator scripts (global NPM "typescript" package)

### Provided dependencies

_These are provided as NPM modules_

- @types/node
- @types/showdown
- highlight.js
- json5
- showdown

## Usage

1. Edit markdown files in the "docs" folder
2. Run `build.bat` to generate static assets
3. Deploy the dist folder to your server

Note: The entire "dist" folder will be deleted and recreated every time you run the generator script.

### Special markdown format

This generator expects your markdown file to start with a JSON code block.
See `example.md` for details.

This code block will not be present in the generated output

## Customizing

- You can edit the html template files in the "gen" folder to customize them.
- You can freely change the contents of the "static" folder if you wish to work with other frameworks
