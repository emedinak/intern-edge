# InternEdge — AI Internship Assistant

## Setup local

```bash
npm install
cp .env.example .env
# Add your Anthropic API key to .env
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import repo
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Deploy → get your public URL
