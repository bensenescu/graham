# Graham - Refine your answers

As I build my business, I'm constantly answering similar questions over and over. Graham is for refining answers to questions.

It's also great for you and your team to perfect you application to YCombinator.

Features:

- Use off the shelf templates like the YCombinator Application questions
- Create pages for your pitch to investors, customers or friends and family.
- Customize prompts for AI to help you improve your answers
- Practice mode: record yourself answering questions verbally, get transcriptions, and self-rate your performance
- Share pages with collaborators for real-time multiplayer editing

## Self Hosting

1. Complete below prerequisites
2. Run these commands:

```sh
git clone https://github.com/bensenescu/graham.git
cd graham
npx everyapp app deploy
```

3. Add your OPENAI_API_KEY:

```sh
npx wrangler secret put OPENAI_API_KEY
```

### Prerequisites

Graham was built as part of my larger project: [Every App](https://github.com/every-app/every-app). Every App hoists common logic out of individual apps like auth and user management so that each app doesn't need to reinvent the wheel.

The goal is to foster an open source ecosystem of apps and make it more accessible to people who aren't already self hosting software themselves.

Every App apps are self hosted on Cloudflare so there is a little bit of initial setup, but then self hosting more apps is as simple as the `npx everyapp app deploy` above.

1. Install [Node.js](https://nodejs.org/)

   This also installs `npx`, a tool that runs Node packages without installing them globally. You'll see `npx` commands throughout these docs.

2. Make a Cloudflare Account (No credit card needed) - https://dash.cloudflare.com/sign-up

   Skip any Cloudflare onboarding like configuring a domain, this is unnecessary for Every App.

3. Authenticate with Cloudflare (choose one):
   - Login via the [Cloudflare CLI](https://developers.cloudflare.com/workers/wrangler/commands/#login) (recommended):
     ```bash
     npx wrangler login
     ```
   - Or set the `CLOUDFLARE_API_TOKEN` environment variable
4. Self host the Every App Gateway
   - `npx everyapp gateway deploy`
   - Follow the link this returns to create your account in the Gateway.

## Local Development

### Setup

1. `cp .env.example .env.local`
   - The `GATEWAY_URL` should match your gateway from `npx everyapp gateway deploy`
2. `pnpm run db:migrate:local`
3. `pnpm install`

### Run locally

`pnpm dev`

