# Graham - Refine your answers

I'm constantly fielding similar questions. Graham is for refining the answers to questions. One great example: helping your team to perfect your application to YCombinator.

Features:

- 📔 Use templates like the YC App questions.
- 🤪 Create pages for your pitch to investors, customers, or friends and family.
- ✨ AI Review with customizable prompts
- 🎤 Practice mode: answer questions verbally, get transcriptions, and self-rate your performance
    - Mobile friendly ✅
- 👫 Share pages for real-time multiplayer editing
- 🔒 Authentication & User Management via [Every App](https://github.com/every-app/every-app)

### Customizable AI Review

<img width="1724" alt="Customizable AI Review" src="https://github.com/user-attachments/assets/d11bb5e9-6d83-4a61-b907-7db5eb15c2af" />

### Collaborate with your teammates

![Collaborate with your teammates](https://github.com/user-attachments/assets/6c52b61e-050e-45b6-9468-250dfd84b6aa)

### Practice your answers

<img width="1722" alt="Practice your answers" src="https://github.com/user-attachments/assets/1c49586a-f239-44fc-acd7-f22814093cf0" />

## Run Locally (Demo)

If you don't have a Cloudflare account and just want to test it out, run it locally with these steps:

```sh
git clone https://github.com/bensenescu/graham.git
cd graham
pnpm i
DEMO_MODE_LOCAL_ONLY=true pnpm run dev
```

If you want use AI features, create a .env.local with these values:

```
VITE_APP_ID=graham
OPENAI_API_KEY=your-key
```

## Self Hosting

1. Complete [Prerequisites](#prerequisites)
2. Run these commands:

```sh
git clone https://github.com/bensenescu/graham.git
cd graham
npx everyapp app deploy
```

3. Add your OPENAI_API_KEY (other providers should be easy to add if you want to contribute a PR!):

```sh
npx wrangler secret put OPENAI_API_KEY
```

### Prerequisites

Graham was built as part of my larger project: [Every App](https://github.com/every-app/every-app). Every App hoists common logic out of individual apps like auth and user management so that each app doesn't need to reinvent the wheel.

The goal is to foster an open source ecosystem of apps and make them more accessible to people who aren't already self hosting software themselves.

Every App apps are self hosted on Cloudflare so there is a little bit of initial setup, but then self hosting more apps is as simple as the `npx everyapp app deploy` above.

1. Make a Cloudflare Account (No credit card needed) - https://dash.cloudflare.com/sign-up

   Skip any Cloudflare onboarding like configuring a domain, this is unnecessary for Every App.

2. Authenticate with Cloudflare (choose one):
   - Login via the [Cloudflare CLI](https://developers.cloudflare.com/workers/wrangler/commands/#login) (recommended):
     ```bash
     npx wrangler login
     ```
   - Or set the `CLOUDFLARE_API_TOKEN` environment variable
3. Self host the Every App Gateway
   - `npx everyapp gateway deploy`
   - Follow the link this returns to create your account in the Gateway.

## Local Development

### Setup

1. `cp .env.example .env.local`
   - The `GATEWAY_URL` should match your gateway from `npx everyapp gateway deploy`
2. `pnpm run db:migrate:local`
3. `pnpm install`

### Run locally

`pnpm run dev`
