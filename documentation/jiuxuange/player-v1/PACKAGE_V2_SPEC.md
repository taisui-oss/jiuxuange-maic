# MAIC Course Package V2 candidate specification

## Container

File suffix: `.maic-course.zip`

Required entries:

```text
manifest.json
course/classroom.json
```

The manifest declares every included file with media type, byte length, and SHA-256.
ZIP CRC, declared file length, file SHA-256, `content_version`, package ID, source
classroom ID, package format, minimum runtime, scene order, and publication state are
validated before playback.

## Version contract

```text
package_format_version = 2
minimum_runtime_version = 0.3.0
player_version = 1.0.0-rc.1
```

`content_version` hashes the answer-free learner classroom JSON. `source_version` hashes
the reviewed source classroom. Progress binds to `content_version`; a changed package
cannot silently reuse old progress.

## Learner artifact rules

The learner classroom must not contain:

- objective answer keys;
- answer analyses or grading prompts;
- external `http://` or `https://` runtime dependencies;
- API keys or provider configuration;
- personal or project data outside the reviewed course content.

Agent personas remain inside the private server package but are removed from the public
manifest and the page payload. The Player build replaces client-side default persona
content with redacted values.

## Asset status

The five V1 cases are self-contained canvas/HTML courses and require no external media
files. The manifest file map and protected asset endpoint exist, but automatic media
extraction into `asset://sha256/...` and private OSS resolution are not implemented.
Therefore a generic course with external or uploaded media must be rejected at import.

The future asset extension must:

1. write content-addressed files into the package;
2. replace course references with `asset://sha256/<digest>`;
3. validate media existence and hash during import;
4. resolve assets through a short-lived, authorized server URL;
5. never return the private OSS origin or credential to the browser.

This extension can add files without changing the V2 manifest envelope, but it requires a
new reviewed package-builder version and acceptance fixture before use.
