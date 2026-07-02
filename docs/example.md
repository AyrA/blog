```json
{
  //You may skip this property or set it to null in order to use the first h1 level title from the document instead
  "title": "Custom title",
  //A description that is a bit longer than the title
  "desc": "Description",
  //IDO 8601 date of publication, you can set this to "auto" to use the file modification timestamp instead, but be aware that accidental timestamp edits might reorder menu entries
  "date": "2026-02-01T01:02:03+02:00",
  //Information about the author. This entire block is optional, and will be copied from the global config file if absent
  "author": {
    //Display name of the author
    "name": "Custom author",
    //URL of the authors website
    "url": "https://example.com/"
  },
  //Entry tags. This is currently unused
  "tags": ["test-1"]
}
```

# Example blog entry

This document serves as an example blog entry
