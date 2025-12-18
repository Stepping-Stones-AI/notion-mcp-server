# Notion MCP Server

MCP (Model Context Protocol) server for integrating Notion with ChatGPT.

## Features

- Search Notion pages and databases
- Create and update pages
- Query databases
- Append content blocks
- Full Notion API support

## Deployment

1. Create Notion integration at https://www.notion.so/my-integrations
2. Copy your integration token
3. Deploy to Vercel
4. Add NOTION_API_KEY as environment variable in Vercel
5. Use the Vercel URL in ChatGPT's MCP Yettings

## Local Development

```bash
npm install
cp .env.example .env
# Add your NOTION_API_KEY to .env
npm run dev
```

## Usage in ChatGPT

1. Go to ChatGPT Settings → Apps → New App
2. Set MCP Server URL to: `https://your-vercel-url.vercel.app/api`
3. Authentication: No Auth (API key is server-side)
4. Click Create