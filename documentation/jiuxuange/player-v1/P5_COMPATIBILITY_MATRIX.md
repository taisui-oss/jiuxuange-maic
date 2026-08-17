# Gate P5: OpenMAIC 0.3.0 compatibility matrix

## Verdict

**NOT PASSED. Generic classroom import remains closed.**

The five-case release is safe because its published packages contain only native slide
and quiz scenes. Reusing a renderer is not sufficient evidence that every OpenMAIC 0.3.0
classroom has server-authoritative state, protected APIs, and cross-device recovery.

| Capability | Package contract | Native render path | Server state | V1 release status |
|---|---|---|---|---|
| Slide canvas | Verified | Original renderer | Scene completion | Supported |
| Quiz | Verified, answer-free | Original quiz UI | Private grading and versioned progress | Supported |
| Playback actions | Exact source array | Original action engine | Scene completion | Supported |
| Whiteboard actions | Preserved by package | Original action engine | No dedicated whiteboard snapshot | Internal test only |
| Embedded interactive HTML | External URLs rejected | Original keep-alive iframe | Next-scene completion only | Internal test only |
| URL-only interactive | Rejected as non-portable | Not applicable | Not applicable | Blocked |
| Multi-Agent lecture/chat | Roles packaged | Original role and chat UI | Player AI audit | Conditional on provider test |
| PBL v1/v2 | JSON can be serialized | Original PBL renderer exists | PBL APIs and project state are not Player-adapted | Blocked |
| Media assets | Five cases have no external media URL | Native media path retained | OSS resolver not connected | Blocked for generic import |

## Required work before opening imports

1. Define a generic package registry independent of the five-case catalog.
2. Store the private grading artifact separately from the learner package.
3. Extract or upload media as content-addressed package files and resolve `asset://sha256/...`.
4. Add a server adapter for interactive completion events.
5. Add a PBL state repository and expose only the PBL APIs required by Player.
6. Replay representative slide, quiz, embedded interactive, whiteboard, media, discussion,
   and PBL classrooms in desktop and mobile browsers.
7. Run provider-backed multi-Agent and TTS acceptance.

Until these items pass, the package directory and launch-ticket endpoint must only accept
the five reviewed Jiuxuange package IDs.
