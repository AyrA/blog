type BuildConfig = {
    title: string,
    desc: string,
    url: string,
    rss: {
        enabled: boolean,
        author: AuthorInfo
    }
}

type AuthorInfo = {
    name: string,
    url: string
};

type MenuItem = {
    title: string,
    description: string,
    date: Date,
    file: string
    author: AuthorInfo
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
    tags?: string[] | null,
    author?: AuthorInfo | null
};

type MDParseResult = {
    raw: string,
    title: string,
    description?: string | null,
    published?: Date | null,
    author: AuthorInfo
};

type GlobalParams = {
    config: BuildConfig,
    dirs: {
        source: string,
        dest: string
    },
    templates: {
        docs: string,
        menu: string,
        feed: string,
        feedEntry: string
    },
    outFiles: {
        menu: string,
        feed: string
    }
};
