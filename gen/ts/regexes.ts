/** Regular expressions used throughout the generator */
export default {
    /** The config block from a markdown file */
    configBlock: /^\s*```json\s+(.*?)```\s*/is,
    /** Matches ISO8601 dates */
    isoDate: /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.{0,1})(\d{0,})(Z|([\-+])(\d{2})(?::{0,1})(\d{2}))?)?)?)?/,
    /** Matches markdown h1 level title */
    title: /^#\s+(.*)$/m,
    /** Matches HTML code blocks and extracts content and language */
    code: /<code class="(.*?)\s+language-\1">(.*?)<\/code>/gs,
    /** Matches HTML comment blocks */
    htmlComment: /<!--.*?-->\s*/gs
};