# Donna

An interactive professional profile with an AI secretary. Visitors (recruiters, for example) enter with a one-week
access code, browse your portfolio and ask **Donna**, who answers only about your professional background and only
from what you have written.

[![License: MIT](https://img.shields.io/github/license/prodromossarakinou/Donna-AI-Portfolio-Secretary)](LICENSE)
[![Open source](https://img.shields.io/badge/open%20source-yes-0d5eaf)](https://github.com/prodromossarakinou/Donna-AI-Portfolio-Secretary)
[![Last commit](https://img.shields.io/github/last-commit/prodromossarakinou/Donna-AI-Portfolio-Secretary)](https://github.com/prodromossarakinou/Donna-AI-Portfolio-Secretary/commits/main)

Author: **Prodromos Sarakinou** · License: [MIT](LICENSE) · Open source

> The repository ships only demo content for a fictional person ("Alex Demo"). Your own content lives in the
> `knowledge/` folder, which is never committed.

## What it does

- **Access by code**: codes such as `DONNA-7K3P`, with an expiry, one per company. There is no public page.
- **Single-screen landing**: the visitor picks what to see (Who am I, About me, My work, Ask Donna) and the stage
  animates to it.
- **Portfolio**: career timeline, projects with a technology filter, education.
- **Donna**: streaming chat in English or Greek. She answers only from the knowledge base (RAG), declines anything
  off topic and never states technology version numbers.
- **Admin**: access links, markdown knowledge base, timeline, a sandbox to test Donna, usage and cost per API,
  conversations per company, limits, the privacy page, and "Knowledge gaps", where Donna tells you what she is
  missing.

## Stack

Next.js (App Router, TypeScript) · Tailwind · shadcn/ui · Framer Motion · Postgres + pgvector (Prisma) ·
Claude Haiku 5.5 (answers and scope guard) · OpenAI `text-embedding-3-small` (embeddings) ·
Keycloak (admin sign-in) · Docker Compose.

## Installation

You need Docker (with Compose v2), git, an Anthropic API key, an OpenAI API key and a Keycloak where you have
admin rights.

```bash
git clone https://github.com/prodromossarakinou/Donna-AI-Portfolio-Secretary.git
cd Donna-AI-Portfolio-Secretary
./start.sh
```

That is the whole installation. On the first run `start.sh`:

1. Asks only for what is strictly needed: the URL, your name and email, the two API keys and the Keycloak details.
   Secrets are not shown while you type. Everything else (database password, signing secrets) is generated.
2. Walks you through the Keycloak setup (see [Keycloak](#keycloak)) before it asks for the Keycloak values.
3. Writes `.env` (mode 600, outside git).
4. Copies the demo content to `knowledge/` if that folder does not exist.
5. Builds and starts the database and the app, and prints the URL.

If the setup is interrupted, run `./start.sh` again: the non-sensitive answers (URL, name, email, Keycloak issuer,
client ID, role) are remembered in `.setup-answers` and offered as defaults, so you only press Enter. API keys and
the client secret are never saved there and are always asked again.

On later runs the same command just rebuilds and starts. To update, `git pull` and run `./start.sh` again; your
`.env`, your `knowledge/` folder and the database are left as they are.

### First login

1. Open `<APP_URL>/admin` and sign in with your Keycloak user.
2. **Knowledge → Import /knowledge folder**. This loads the demo content (Alex Demo) so you can see everything
   working before you write a line.
3. **Access links → Create link**, then open the site with the code and try Donna.
4. Replace the demo content with your own, following the [content guide](#content-guide) below.

## Keycloak

The app creates nothing in Keycloak. A ready realm file is included:
[`keycloak/donna-realm.json`](keycloak/donna-realm.json). `start.sh` prints the same steps with your own URLs.

1. **Create realm → Resource file →** choose `donna-realm.json` **→ Create**. This creates the realm `Donna`, the
   client `donna-app` (confidential, Authorization Code with PKCE `S256`) and the role `donna-admin`.
2. **Clients → donna-app → Settings**: set your own URL and save.
   - Valid redirect URIs: `<APP_URL>/api/auth/callback/keycloak`
   - Valid post logout redirect URIs: `<APP_URL>/*`
   - Web origins: `<APP_URL>`
3. **Clients → donna-app → Credentials**: copy the Client secret (Regenerate if it is empty).
4. **The role**: **Realm roles** should list `donna-admin`. If it does not:
   **Realm roles → Create role → Role name `donna-admin` → Save**.
5. **Users → Add user**, set a password under **Credentials**, then
   **Role mapping → Assign role → `donna-admin` → Assign**.

Only users with this role can open `/admin`; everyone else gets a 403. The role is read from the access token
(`realm_access.roles` and `resource_access.<client_id>.roles`), so a client role works too.

The issuer the script asks for looks like `https://<host>/realms/Donna` (the realm name has a capital D).

## Content guide

Everything Donna knows and everything the site shows comes from markdown documents you write. A document's title
(its first `# …` line) decides what it is. Write in any language: the cards on the site are produced in clean
English at indexing time, and Donna searches your original text.

### How documents are read

| Title | Where it shows | How many |
|---|---|---|
| `# About me` | Landing: the "Who am I" phrases, the short summary, the personal facts you choose to share | one |
| `# Project: Name` | A card on the Projects page, and Donna's knowledge | one per project |
| `# Education` | The "Education & certifications" section | one |
| anything else | Donna's knowledge only | as many as you need |

Inside a document, every `## heading` becomes its own searchable piece. Keep each section short and about one
thing: Donna finds "## Start and notice" far more reliably than a long paragraph that mentions it in passing.

### What to add first, and in what order

Add content in this order. Each step makes the site usable on its own, so you can stop after any of them.

**1. Profile and status** — Admin → Timeline, top of the page (or `knowledge/timeline.json`).
Name, title, a two-line summary, and the status card (current role, project, focus, availability). This fills the
entry screen, the header and the hero. Do it first: your name is what Donna calls you.

**2. Timeline** — same page, the steps.
One step per role, most recent first, titled `Role · Project name`. Give every step a start and an end; steps
ending in `Present` are your current roles, and Donna lists all of them when asked what you do now.

**3. About me** — one document.
Feeds the landing page and lets Donna answer the personal questions you allow.

```markdown
# About me

## In short

Two sentences about who you are professionally.

## Who I am

- Engineering Lead
- Full-Stack Engineer

## Based in

City, Country

## Languages

Greek (native), English (fluent)

## Hobbies

Only what you are happy to share.
```

**4. Projects** — one document per project, starting with your current and most relevant ones.
Use the exact project name you used in the timeline step, so the step links to the card.

```markdown
# Project: Project name

- Organization: Company
- Period: 01/2024 – Present
- Role: Lead Engineer
- Stack: Next.js, PostgreSQL
- Link: https://example.com
- Order: 1

## What it is

One or two sentences: what it is and what it solves. Mention the domain (eHealth, fintech, logistics) in plain
words, because recruiters ask "has he worked on X before?".

## What I did

- Your responsibilities, one per line
- Team size and what you led, if you led
```

Only the title is required. A project with no "What it is" text is treated as a draft and shown nowhere. `Order`
sorts the cards on the Projects page.

**Open-source projects**: when `Link` is a public GitHub repository, the card gets an "Open source · <license>"
stamp with the license GitHub reports for that repository (MIT, Apache-2.0, and so on). For code hosted elsewhere,
add a line `- License: MIT` yourself.

**5. Availability** — one document. Recruiters ask this in almost every conversation.

```markdown
# Availability and engagement

## Open to opportunities

## Engagement types

## Working mode

## Start and notice

## How to reach
```

**6. Skills in depth** — one document, one section per technology or area.
Say where you used it and how deep you go, in a sentence or two. Add a "Strongest areas" section in your own
words, and say plainly where your experience is limited.

**7. Education** — one document titled `# Education`, one `##` section per degree, certificate or language.

### Keep one source for each fact

Donna answers from every document at once, so the same fact written two ways produces two answers. Put each fact
in one place: a project's details in its project document, dates and roles in the timeline, availability in the
availability document. If you start from a CV, split it into these documents rather than pasting it whole.

### Check your work

- **Admin → Test Donna**: ask a question and see the answer together with the pieces of text it was built from.
- **Admin → Knowledge gaps**: ask Donna what is missing. She compares your documents, projects and timeline with
  the questions visitors actually asked, and names what to add and where.
- **Admin → Projects**: lists the projects that were recognised. "Rebuild cards" regenerates every card.

### Two ways to enter content

- **In the admin** (Knowledge → New document): paste markdown and save. The document is indexed immediately. This is
  the normal way once the site is live.
- **As files** in `knowledge/`, then Knowledge → Import /knowledge folder. Good for the first bulk load. The import
  also replaces the timeline with `knowledge/timeline.json`, so after you start editing the timeline in the admin,
  add documents through the admin instead.

See [`knowledge.example/`](knowledge.example) for a complete, working set.

Write professional facts, and only the personal ones you really want shown. No internal company matters,
evaluations or salaries. Donna never states technology version numbers, whatever the documents contain.

## Feedback

Every access link has a feedback page at `/feedback/<code>` that **never expires**: it keeps working after the
access code itself has expired, and stops only if you revoke or delete the link. Visitors also see a "Feedback"
link in the header while they browse. Copy the link from **Admin → Access links** to send it yourself.

The form asks four required questions (overall usefulness 1–5, ease of finding things 1–5, whether Donna answered,
whether it was enough to decide to make contact) and four optional ones (what was missing, what to change, name or
role, email). **Admin → Feedback** shows the averages and every response, labelled with the company of the link it
came from.

## What is stored

Questions and answers, the IP address and browser on each entry, and one essential sign-in cookie. The text of
every question is sent to Anthropic and to OpenAI. The `/privacy` page explains this to visitors and is edited in
**Admin → Privacy page**. Adapt it to your own situation.

## Limits and cost

Per code: messages per day. Per answer: maximum tokens. Per IP: messages per minute and code attempts. Overall: a
monthly cost cap, after which Donna stops answering until the next month. All of these are changed in
**Admin → Limits**. **Admin → Usage** shows Claude and OpenAI usage separately; the amounts are estimates from
token counts.

## Environment variables

`start.sh` writes them for you. The full list is in [`env.example`](env.example).

| Variable | Purpose |
|---|---|
| `APP_URL`, `NEXTAUTH_URL`, `DOMAIN` | The public URL of the app |
| `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PRONOUNS` | Name used before the profile is loaded, email on the privacy page, pronouns Donna uses |
| `ANTHROPIC_API_KEY`, `DONNA_MODEL`, `DONNA_GUARD_MODEL` | Donna's model |
| `OPENAI_API_KEY`, `EMBEDDING_MODEL` | Embeddings |
| `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `ADMIN_ROLE` | Admin sign-in |
| `SESSION_SECRET`, `NEXTAUTH_SECRET` | Cookie signing (generated automatically) |
| `POSTGRES_*`, `DATABASE_URL` | Database |
| `MAX_MESSAGES_PER_DAY`, `MAX_TOKENS_PER_ANSWER`, `MONTHLY_COST_CAP_USD`, `RATE_LIMIT_PER_MINUTE` | Initial limits |

## Development

```bash
cp env.example .env        # then fill it in
docker compose up -d db
npm install
npx prisma migrate deploy
npm run dev
```

Helpers: `npm run knowledge:import` (import from `knowledge/`) and `npm run link:create -- "Company"` (an access
code from the terminal).

## On a server

`--profile prod` starts the database and the app; the app listens only on `127.0.0.1:3000`, so it sits behind your
reverse proxy. The chat streams, so the proxy must not buffer:

```
donna.example.com {
	reverse_proxy 127.0.0.1:3000 {
		flush_interval -1
	}
}
```

Without a proxy of your own, add the bundled Caddy (ports 80/443, automatic TLS):

```bash
docker compose --profile prod --profile caddy up -d --build
```

The database lives in a Docker volume named `<folder>_donna-db`, after the folder the project is in (set
`COMPOSE_PROJECT_NAME` in `.env` to choose the name yourself), so two copies in different folders never share data. For updates over rsync there is `scripts/deploy.sh`:

```bash
DEPLOY_TARGET=user@server DEPLOY_PATH=/opt/donna ./scripts/deploy.sh
```

To avoid typing them each time, put `DEPLOY_TARGET`, `DEPLOY_PATH` and optionally `DEPLOY_KEY` (an SSH identity
file) in `scripts/deploy.local`, one `NAME=value` per line. That file is ignored by git.

It never sends `.env` and never touches the database; the app applies new migrations itself on start.

## License

MIT © Prodromos Sarakinou
