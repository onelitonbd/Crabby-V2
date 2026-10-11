'use strict';
const registry = require('./registry');
const config   = require('../config');

// No default endpoint is bundled. Set `social.endpoint` in ~/.crabby/config.json
// to the base URL of a Crabby-social server you run yourself.
const NOT_CONFIGURED = 'social network not configured — set "social": { "endpoint": "https://your-server" } in config.json';

function socialUrl() {
  const cfg = config.load();
  return (cfg.social && cfg.social.endpoint || '').replace(/\/+$/, '');
}

function getSocialConfig() {
  const cfg = config.load();
  return cfg.social || {};
}

function saveSocialConfig(social) {
  const cfg = config.load();
  config.save(Object.assign({}, cfg, { social: social }));
}

function authHeaders() {
  const s = getSocialConfig();
  const headers = { 'Content-Type': 'application/json' };
  if (s.token)    headers['X-Crabby-Token']  = s.token;
  if (s.deviceId) headers['X-Crabby-Device'] = s.deviceId;
  return headers;
}

async function api(method, endpoint, body) {
  const base = socialUrl();
  if (!base) throw new Error(NOT_CONFIGURED);
  const opts = { method: method, headers: authHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(base + endpoint, opts);
  if (!res.ok) {
    const e = await res.json().catch(function() { return { error: res.status }; });
    throw new Error(e.error || 'HTTP ' + res.status);
  }
  return res.json();
}

async function ensureRegistered() {
  const base = socialUrl();
  if (!base) throw new Error(NOT_CONFIGURED);
  const s = getSocialConfig();
  if (s.token) return s;
  const cfg    = config.load();
  const name = 'crabby_' + (cfg.name || 'crabby').toLowerCase().replace(/[^a-z0-9]/g, '');
  const device = cfg.device || 'android';
  const res    = await fetch(base + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, device_id: device }),
  });
  const result = await res.json();
  const social = { crabbyId: result.crabby_id, handle: result.handle, token: result.token, deviceId: device, endpoint: base };
  saveSocialConfig(social);
  return social;
}

registry.register('social_post', async function(args) {
  if (!args.content) return 'error: content required';
  if (args.content.length > 500) return 'error: max 500 characters';
  try {
    const s = await ensureRegistered();
    await api('POST', '/post', { content: args.content, tags: args.tags || [] });
    return 'posted as @' + s.handle;
  } catch(e) { return 'error: ' + e.message; }
}, 'post something to the crabby social network');

registry.register('social_feed', async function(args) {
  try {
    await ensureRegistered();
    const ep     = args.crabby ? '/feed/' + args.crabby : '/feed';
    const result = await api('GET', ep + '?limit=' + (args.limit || 10));
    if (!result.posts || !result.posts.length) return 'no posts yet.';
    return result.posts.map(function(p) {
      return '@' + p.handle + ' [' + new Date(p.created_at).toLocaleDateString() + ']: ' + p.content;
    }).join('\n\n');
  } catch(e) { return 'error: ' + e.message; }
}, 'read the crabby social network feed');

registry.register('social_follow', async function(args) {
  if (!args.handle) return 'error: handle required';
  try {
    await ensureRegistered();
    const result = await api('POST', '/follow', { target_handle: args.handle.replace('@','') });
    return result.message;
  } catch(e) { return 'error: ' + e.message; }
}, 'follow another crabby');

registry.register('social_search', async function(args) {
  if (!args.query) return 'error: query required';
  try {
    await ensureRegistered();
    const result = await api('GET', '/search?q=' + encodeURIComponent(args.query) + '&limit=' + (args.limit || 10));
    if (!result.posts || !result.posts.length) return 'no posts found for "' + args.query + '"';
    return result.posts.map(function(p) { return '@' + p.handle + ': ' + p.content; }).join('\n\n');
  } catch(e) { return 'error: ' + e.message; }
}, 'search posts on crabby social');

registry.register('social_profile', async function(args) {
  try {
    const s      = await ensureRegistered();
    const target = args.handle ? args.handle.replace('@','') : s.handle;
    const result = await api('GET', '/crabby/' + target);
    return '@' + result.handle + ' (' + result.name + ')\nposts: ' + result.post_count + ' · followers: ' + result.followers + ' · following: ' + result.following;
  } catch(e) { return 'error: ' + e.message; }
}, 'view a crabby profile');

registry.register('social_stats', async function() {
  try {
    const result = await api('GET', '/stats');
    return 'crabby social: ' + result.crabbys + ' crabbys · ' + result.posts + ' posts · ' + result.follows + ' follows';
  } catch(e) { return 'error: ' + e.message; }
}, 'get crabby social network stats');

registry.register('social_whoami', async function() {
  try {
    const s = await ensureRegistered();
    return 'you are @' + s.handle + ' on crabby social';
  } catch(e) { return 'error: ' + e.message; }
}, 'show your crabby social handle');

module.exports = {};
