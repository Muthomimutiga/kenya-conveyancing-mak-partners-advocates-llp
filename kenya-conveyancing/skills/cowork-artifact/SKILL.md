---
name: cowork-artifact
description: >
  Use whenever a command must publish a generated HTML page as a live, persisted
  artifact: a per-person desk, the Conveyancing Tracker, the Litigation Brief, or
  any new dashboard. Triggers on /setup-project-desk, /setup-conveyancing-artifact,
  /setup-brief, "register the artifact", "install the dashboard". Encodes how the
  product actually does it (verified 8 Sep 2026 against the Claude Desktop app code,
  Anthropic's help article, and two real client sessions): there are two artifact
  systems, a session has exactly one, and the procedure detects which before it
  does anything.
version: 3.1.0
last_verified: 2026-09-08
freshness_window: 90d
freshness_category: volatile
verified_against: "Claude Desktop artifact tooling as observed 8 Sep 2026 (CoWork create_artifact and the Artifact tool), two client sessions, and Anthropic's published help article"
---

# Publishing a live artifact

## Scope, audience and delegation

**Audience:** the firm's own staff running a setup command (`/setup-conveyancing-artifact`
and its siblings). They are advocates and administrators, not engineers, and they will
read the tool's reply, not the HTML.

**Work shape:** pattern-matched review. The two artifact systems and their failure
messages are known and repetitive, so the procedure runs with high autonomy on the
recognised paths, and the whole design is escalation triggers for anything out of
pattern: neither system present, a chat rather than a task, an approval hold, a reply
that is not one of the two successes.

**Delegation threshold:** Claude detects the system, publishes, and reports the tool's
own reply. The person decides whether to grant the page connector access and whether the
published page is fit to circulate. Claude never decides that a page is live; the tool's
reply decides, and Claude quotes it.

**Confidence handling.** High: the detection came back with one of the two tool sets and
the tool replied with a recognised success. Publish and report it in the tool's words.
Medium: the reply is a recognised failure with a known cause (already exists, chat rather
than a task, approval held). Say which one, say what it means, and take only the step
that message calls for. Low: the reply is anything else, or neither tool set is present.
Do not interpret it, do not retry, do not route around it. Quote it, stop, and hand back.
Never report an artifact as published on any confidence but the tool's own reply.

**Privilege and confidentiality.** The dashboards this skill publishes read live client
matter from the firm's Airtable base: party names, national ID and KRA PIN numbers,
purchase prices and title particulars, which carry advocate-client confidentiality under
the Evidence Act (Cap 80) sections 134 to 137 and party personal data under the Data
Protection Act 2019. Publishing grants the page access to that base under the person's
own credentials, and anyone who can open the page sees what the page can read. Before
publishing, say plainly which connectors and which tools the page will be granted and
what it will display. Publish only to the person whose matters the page shows, or where
the firm has decided the page is shared, and never widen the declared tools beyond what
the page's own code calls. The published page is not a place to put anything the firm
would not put in the base itself.

**What this skill does NOT do.** It does not write the page: the command that calls it
owns the HTML. It does not decide who may see a page or what data belongs on one; that
is the firm's call. It does not grant connector access on the person's behalf: an
approval hold is theirs to answer. It does not publish the Conveyancing Tracker or the
Litigation Brief under the updated system, where they would open static. And it does not
present, attach, download or link the HTML file in place of an artifact, ever.

**Escalate and stop when:** the session has neither artifact system; the session is a
chat rather than a Cowork task; a connector tool the page calls cannot be verified on the
person's own data; the approval hold comes back and the person has not answered; or the
tool replies anything the procedure below does not name. In each case say what came back,
in the tool's words, and what the person needs to do. Do not invent a route.

**Owner and review.** Owner: Robin Advisory Group (build). Both artifact systems are the
product's, not the firm's, and they change: re-verify this skill against a live session
whenever an install behaves differently from the procedure below, and in any case within
the freshness window declared above.


## Read this first: it is one or the other, and you must find out which

**Do not assume either system.** Every one of today's failed installs came from
assuming. A session has exactly one of the two systems below. The first thing
this skill does is find out which, with ToolSearch, and every later step follows
from that answer. If you cannot tell, you are not ready to publish.

## Two systems, one procedure

Claude currently ships two artifact systems. A session has one of them, never
both, and which one depends on the account and the rollout, not on anything
the command can change. Both were seen on client sessions on 8 Sep 2026.

| | **Older system: CoWork live artifacts** | **Updated system: the Artifact tool** |
|---|---|---|
| The tool | `mcp__cowork__create_artifact` (MCP server `cowork`; prefix is part of the name) with `mcp__cowork__update_artifact`, `mcp__cowork__list_artifacts`, `mcp__cowork__verify_artifact` | The top-level **`Artifact`** tool (not an MCP tool; it takes a `capabilities` argument) |
| The file | A complete HTML document (`<!DOCTYPE html>` … `</html>`) at an absolute path the session can read, e.g. the outputs folder | A fragment: `<title>`, `<style>` and body content only; the tool wraps it in its own document |
| Connector access | `mcp_tools`: fully qualified ids `mcp__<segment>__<tool>` exactly as this session's tool names read (the segment is a UUID on some accounts, a display name like `Airtable` on others) | `capabilities: {"mcp": {"servers": [{"server": "<connector display name>", "tools": ["<upstream tool name>", …]}]}}`; the display name is what claude.ai shows (`Airtable`, `Microsoft 365`) |
| Inside the page | `window.cowork.callMcpTool("mcp__<segment>__<tool>", args)` → `{content, structuredContent, isError}` | `await window.claude.use("mcp")` then `mcp.callTool("<display name>", tool, args)` → `{payload, …}`; tool failures reject |
| Where it lives | `Documents/Claude/Artifacts/<id>/` on the machine; opens in the Artifacts view of the Cowork sidebar, "Cowork" label | A private page on claude.ai; the tool returns its URL; re-publish in place by passing that `url` |
| Identity of the page | The `id` slug you choose | The URL the first publish returned; store it or the next run makes a second page |
| Chat sessions | The tool exists but ignores `mcp_tools` ("chat artifacts can't grant connector access"): the page opens static | Publishing may be held for the person's approval (a permission-denied result, not a tool error): stop and wait, do not retry or drop the capability |

The per-person desk carries both page transports and ships both file shapes
(`project-desk-template.html` for the older system, `project-desk-artifact-template.html`
for the updated one). The Conveyancing Tracker and the Litigation Brief carry only
the older transport today: under the updated system they would open static, so
stop and say so rather than publish them there.

## The procedure

1. **Detect the system.** Call ToolSearch for `artifact` and read the names that
   come back. `mcp__cowork__create_artifact` present: older system. Otherwise
   the `Artifact` tool present: updated system. Neither: stop and tell the user,
   *"This session cannot publish artifacts: it has neither CoWork's artifact
   tools nor the Artifact tool. Start a new Cowork task in Claude Desktop and run
   the command again."* Never invent a third route and never present the file.
2. **Verify every connector tool the page will call** once in this session, on
   the person's own data with a small limit, so the ids or names you declare
   are real. List every tool the page calls, including writes this session did
   not make: the page's own code makes them.
3. **Older system.** Write the complete-document file to the outputs folder,
   then call `mcp__cowork__create_artifact` with `id`, `html_path`,
   `description`, `mcp_tools`. Reply `Artifact "<id>" created.` is success.
   *"already exists"*: call `mcp__cowork__update_artifact` with the same `id`,
   `html_path`, `mcp_tools` and an `update_summary`. *"chat artifacts can't
   grant connector access"*: this is a chat; the user must start a Cowork task.
   If `mcp__cowork__verify_artifact` exists, call it once and report errors.
   Tell the user the artifact is in the Artifacts view of the Cowork sidebar
   and that the first open asks them to allow the connectors.
4. **Updated system.** Write the fragment file, then call `Artifact` with
   `file_path`, `title`, `description`, `favicon` (first publish only),
   `capabilities` naming every connector and tool the page calls, and `url`
   when a stored URL exists for this page and person. Success returns a URL:
   **store it immediately** where the command says (the per-person desk writes it
   to the person's Team row, field `Desk URL`). A permission-denied result is
   the approval hold: tell the user what access you were about to grant and
   why, and wait; retry the identical call only when they say yes. Tell the
   user the page opens from the link and from their Artifacts gallery, and that
   the first open asks them to allow the connectors.
5. **Either system:** read the tool's reply and report exactly what it said.
   Never present, attach, download or link the HTML file; the artifact is the
   deliverable.

## Pitfalls, all seen on 8 Sep 2026

1. **Searching for a bare `create_artifact`.** The older tool is named
   `mcp__cowork__create_artifact`; the prefix is the name. A search for the bare
   word finds nothing and the model concludes the tool is absent.
2. **Declaring one system the only one.** A session written for the older
   system stops dead on the updated one, and the reverse. Detect, every run.
3. **"Registering" by writing the file.** Writing into the outputs folder, or
   presenting the file, produces a download, never an artifact. Only the tool
   call registers.
4. **Presenting the HTML anyway.** The person then opens a static copy in a
   browser and sees the demo picker or "Static build". Never present it.
5. **Running in a chat.** The older tool ignores `mcp_tools` there; the page
   opens static. Cowork task only.
6. **Wrong file shape.** The older system needs a complete document; the
   updated system needs a fragment and wraps it. The per-person desk ships both.
7. **Forgetting `url` on a re-run** (updated system) makes a second page.
   Read the stored URL first; write it back the moment a first publish succeeds.
8. **Reading the approval hold as an error** (updated system). A
   permission-denied result means the person must say yes to granting the
   page connector access. Stop and wait; retry the identical call after yes.
9. **Trimming `mcp_tools` or `capabilities` to tools this session called.**
   The page calls writes the setup never made. Declare every tool the page's
   code calls.
10. **Wrong connector address inside the page.** Older system: the segment in
    this session's tool ids, verbatim (a UUID or a name). Updated system: the
    display name claude.ai shows. Microsoft 365 reads `Microsoft_365` in tool
    ids and `Microsoft 365` as a display name.
11. **Trusting the meta block.** The `cowork-artifact-meta` block in the file is
    replaced by the older system and ignored by the updated one. The tool call
    is the declaration.
12. **Saying "done" on a written file.** Success is the tool's reply: `Artifact
    "<id>" created.`, or a returned URL. Quote anything else and stop.

