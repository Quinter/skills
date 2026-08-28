#!/usr/bin/env node
// Action Tracker website — zero-dependency Node server.
// Serves the checklist UI and a small JSON API over ~/.claude/action-tracker/actions.md.
// Usage: node server.mjs [--port 4173]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIONS_FILE =
  process.env.ACTION_TRACKER_FILE ||
  path.join(os.homedir(), '.claude', 'action-tracker', 'actions.md');

const portArg = process.argv.indexOf('--port');
const PORT = portArg !== -1 ? Number(process.argv[portArg + 1]) : 4173;

const META_RE = /<!--\s*at:(.*?)\s*-->\s*$/;
const ITEM_RE = /^- \[( |x|X)\] (.*)$/;
const CONTEXT_RE = /^ {2}> ?(.*)$/;

function parseMeta(metaStr) {
  // "id=k3f9x2 jira=CJ-12529 project=sor-client session=007f7f3b created=... done=..."
  const meta = {};
  for (const tok of metaStr.trim().split(/\s+/)) {
    const eq = tok.indexOf('=');
    if (eq > 0) meta[tok.slice(0, eq)] = tok.slice(eq + 1);
  }
  return meta;
}

function readFileSafe() {
  try {
    return fs.readFileSync(ACTIONS_FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return '# Actions\n';
    throw err;
  }
}

// Parse the markdown into sessions/items. `lineNo` is kept so writes are line-level.
function parseActions(content) {
  const lines = content.split('\n');
  const sessions = [];
  let current = null;
  let lastItem = null;
  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      current = { heading: line.slice(3).trim(), items: [] };
      sessions.push(current);
      lastItem = null;
      return;
    }
    const ctx = line.match(CONTEXT_RE);
    if (ctx && lastItem) {
      lastItem.context += (lastItem.context ? '\n' : '') + ctx[1];
      return;
    }
    const m = line.match(ITEM_RE);
    if (!m) {
      if (line.trim()) lastItem = null; // blank lines don't break a context block
      return;
    }
    const metaMatch = m[2].match(META_RE);
    const meta = metaMatch ? parseMeta(metaMatch[1]) : {};
    if (!meta.id) { lastItem = null; return; } // not an action-tracker item
    if (!current) {
      current = { heading: '(no session)', items: [] };
      sessions.push(current);
    }
    lastItem = {
      id: meta.id,
      text: m[2].replace(META_RE, '').trim(),
      checked: m[1].toLowerCase() === 'x',
      jira: meta.jira || '',
      project: meta.project || '',
      session: meta.session || '',
      created: meta.created || '',
      done: meta.done || '',
      context: '',
      lineNo: i,
    };
    current.items.push(lastItem);
  });
  return sessions;
}

function utcNowMinutes() {
  return new Date().toISOString().slice(0, 16) + 'Z';
}

// Rewrite exactly one line (found by item id), leaving every other byte untouched.
function editItemLine(id, editFn) {
  const content = readFileSafe();
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(ITEM_RE);
    if (!m) continue;
    const metaMatch = m[2].match(META_RE);
    if (!metaMatch) continue;
    const meta = parseMeta(metaMatch[1]);
    if (meta.id !== id) continue;
    const newLine = editFn(lines[i], m, meta);
    if (newLine === null) return { ok: false, error: 'edit rejected' };
    lines[i] = newLine;
    fs.writeFileSync(ACTIONS_FILE, lines.join('\n'));
    return { ok: true };
  }
  return { ok: false, error: `no item with id ${id}` };
}

function toggleItem(id) {
  return editItemLine(id, (line, m, meta) => {
    const checked = m[1].toLowerCase() === 'x';
    if (checked) {
      // uncheck: remove done= from the meta comment
      return line
        .replace(/^- \[[xX]\]/, '- [ ]')
        .replace(/ done=[^\s]*(?=\s*-->)/, '')
        .replace(/ done=[^\s]+ /, ' ');
    }
    // check: add done= just before -->
    return line
      .replace(/^- \[ \]/, '- [x]')
      .replace(/\s*-->\s*$/, ` done=${utcNowMinutes()} -->`);
  });
}

function setJira(id, ticket) {
  if (!/^[A-Z][A-Z0-9]+-\d+$/.test(ticket)) {
    return { ok: false, error: 'ticket must look like CJ-12345' };
  }
  return editItemLine(id, (line, m, meta) => {
    let newLine = line.replace(/(<!--\s*at:.*?)jira=[^\s]*/, `$1jira=${ticket}`);
    if (newLine === line) {
      // no jira= key present; insert one after the id
      newLine = line.replace(/(<!--\s*at:id=[^\s]+)/, `$1 jira=${ticket}`);
    }
    // add the ticket to the visible text if it isn't there already
    if (!newLine.includes(`**${ticket}**`) && !m[2].includes(ticket)) {
      newLine = newLine.replace(/^(- \[( |x|X)\] )/, `$1**${ticket}** `);
    }
    return newLine;
  });
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 65536) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const handler = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/actions') {
      json(res, 200, { file: ACTIONS_FILE, sessions: parseActions(readFileSafe()) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/toggle') {
      const { id } = JSON.parse((await readBody(req)) || '{}');
      if (!id) return json(res, 400, { ok: false, error: 'id required' });
      const result = toggleItem(id);
      return json(res, result.ok ? 200 : 404, result);
    }
    if (req.method === 'POST' && url.pathname === '/api/set-jira') {
      const { id, ticket } = JSON.parse((await readBody(req)) || '{}');
      if (!id || !ticket) return json(res, 400, { ok: false, error: 'id and ticket required' });
      const result = setJira(id, String(ticket).trim().toUpperCase());
      return json(res, result.ok ? 200 : 400, result);
    }
    json(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    json(res, 500, { ok: false, error: String(err.message || err) });
  }
};

export { ACTIONS_FILE, parseActions, readFileSafe };

export function startServer(port = PORT) {
  const server = http.createServer(handler);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Action Tracker: http://127.0.0.1:${port}`);
    console.log(`Actions file:   ${ACTIONS_FILE}`);
  });
  return server;
}

// CLI entrypoint: `node server.mjs [--port N]`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
