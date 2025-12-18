const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// MCP Protocol Handlers
const tools = [
  {
    name: 'notion_search_pages',
    description: 'Search Notion pages and databases by title',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        filter_value: { type: 'string', enum: ['page', 'database'] },
      },
    },
  },
  {
    name: 'notion_create_page',
    description: 'Create a new Notion page',
    inputSchema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'Parent page or database ID' },
        title: { type: 'string', description: 'Page title' },
      },
      required: ['parent_id', 'title'],
    },
  },
  {
    name: 'notion_append_blocks',
    description: 'Append content blocks to a page',
    inputSchema: {
      type: 'object',
      properties: {
        block_id: { type: 'string', description: 'Page or block ID' },
        children: { type: 'array', description: 'Array of block objects' },
      },
      required: ['block_id', 'children'],
    },
  },
  {
    name: 'notion_query_database',
    description: 'Query a Notion database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'string', description: 'Database ID' },
        sorts: { type: 'array', description: 'Sort configuration' },
      },
      required: ['database_id'],
    },
  },
  {
    name: 'notion_create_database_row',
    description: 'Create a new row in a database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'string', description: 'Database ID' },
        properties: { type: 'array', description: 'Row properties' },
      },
      required: ['database_id', 'properties'],
    },
  },
  {
    name: 'notion_update_page',
    description: 'Update a Notion page or database row',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: 'Page ID to update' },
        properties: { type: 'array', description: 'Properties to update' },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'notion_get_block_children',
    description: 'Get child blocks of a page or block',
    inputSchema: {
      type: 'object',
      properties: {
        block_id: { type: 'string', description: 'Parent block ID' },
      },
      required: ['block_id'],
    },
  },
  {
    name: 'notion_archive_page',
    description: 'Archive (delete) a Notion page',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: 'Page ID to archive' },
      },
      required: ['page_id'],
    },
  },
];

// MCP Endpoints
app.get('/api', (req, res) => {
  res.json({
    name: 'Notion MCP Server',
    version: '1.0.0',
    protocol: 'mcp',
    capabilities: {
      tools: true,
    },
  });
});

app.post('/api/tools/list', (req, res) => {
  res.json({ tools });
});

app.post('/api/tools/call', async (req, res) => {
  const { name, arguments: args } = req.body;

  try {
    let result;

    switch (name) {
      case 'notion_search_pages':
        result = await notion.search({
          query: args.query || '',
          filter: args.filter_value ? { property: 'object', value: args.filter_value } : undefined,
        });
        break;

      case 'notion_create_page':
        result = await notion.pages.create({
          parent: { page_id: args.parent_id },
          properties: {
            title: {
              title: [{ text: { content: args.title } }],
            },
          },
        });
        break;

      case 'notion_append_blocks':
        result = await notion.blocks.children.append({
          block_id: args.block_id,
          children: args.children,
        });
        break;

      case 'notion_query_database':
        result = await notion.databases.query({
          database_id: args.database_id,
          sorts: args.sorts,
        });
        break;

      case 'notion_create_database_row':
        const properties = {};
        args.properties.forEach(prop => {
          properties[prop.name] = formatPropertyValue(prop);
        });
        result = await notion.pages.create({
          parent: { database_id: args.database_id },
          properties,
        });
        break;

      case 'notion_update_page':
        const updateProps = {};
        if (args.properties) {
          args.properties.forEach(prop => {
            updateProps[prop.name] = formatPropertyValue(prop);
          });
        }
        result = await notion.pages.update({
          page_id: args.page_id,
          properties: updateProps,
        });
        break;

      case 'notion_get_block_children':
        result = await notion.blocks.children.list({
          block_id: args.block_id,
        });
        break;

      case 'notion_archive_page':
        result = await notion.pages.update({
          page_id: args.page_id,
          archived: true,
        });
        break;

      default:
        return res.status(400).json({ error: 'Unknown tool' });
    }

    res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function formatPropertyValue(prop) {
  switch (prop.type) {
    case 'title':
      return { title: [{ text: { content: prop.value } }] };
    case 'rich_text':
      return { rich_text: [{ text: { content: prop.value } }] };
    case 'number':
      return { number: parseFloat(prop.value) };
    case 'select':
      return { select: { name: prop.value } };
    case 'multi_select':
      return { multi_select: prop.value.split(',').map(v => ({ name: v.trim() })) };
    case 'date':
      return { date: { start: prop.value } };
    case 'checkbox':
      return { checkbox: prop.value === 'True' };
    case 'url':
      return { url: prop.value };
    default:
      return { rich_text: [{ text: { content: prop.value } }] };
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Notion MCP Server running on port ${PORT}`);
});

module.exports = app;