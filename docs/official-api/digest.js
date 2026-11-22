const fs = require('fs');
const s = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));
const out = [];
const add = (x) => out.push(x);

add('# PATHS / OPERATIONS');
for (const [p, item] of Object.entries(s.paths)) {
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    const o = item[m];
    if (!o) continue;
    const scope = o['x-required-scope'] || '-';
    const sec = o.security ? JSON.stringify(o.security) : 'global(bearer)';
    const ps = (o.parameters || []).map(x => x.$ref ? x.$ref.split('/').pop() : x.name + ':' + x.in).join(',');
    const resp = o.responses ? Object.keys(o.responses).join(',') : '';
    add([m.toUpperCase(), p, scope, (o.tags || []).join('+'), sec, 'responses=' + resp, 'params=' + ps].join(' | '));
    add('  summary: ' + (o.summary || ''));
    add('  desc: ' + (o.description || '').replace(/\s+/g, ' '));
  }
}

add('\n# WEBHOOKS TOP-LEVEL');
add(JSON.stringify(s.webhooks, null, 1));

add('\n# X-HMAC-VERIFICATION');
add(JSON.stringify(s['x-hmac-verification'], null, 1));

add('\n# COMPONENT RESPONSES (description + status + schema)');
for (const [name, r] of Object.entries(s.components.responses)) {
  add('## ' + name + ' :: ' + (r.description || '').replace(/\s+/g, ' '));
  if (r.content) {
    for (const [ct, c] of Object.entries(r.content)) {
      add('  content ' + ct + ' schema=' + JSON.stringify(c.schema));
      if (c.example) add('  example=' + JSON.stringify(c.example));
      if (c.examples) add('  examples=' + JSON.stringify(c.examples));
    }
  }
  if (r.headers) add('  headers=' + JSON.stringify(r.headers));
}

add('\n# COMPONENT SCHEMAS');
for (const [name, sc] of Object.entries(s.components.schemas)) {
  add('## ' + name + ' :: ' + (sc.description || '').replace(/\s+/g, ' '));
  if (sc.type) add('  type=' + sc.type + ' required=' + JSON.stringify(sc.required || []));
  if (sc.properties) {
    for (const [pn, pv] of Object.entries(sc.properties)) {
      add('  - ' + pn + ' :: ' + JSON.stringify(pv));
    }
  }
  for (const k of ['oneOf', 'anyOf', 'allOf', 'enum', 'items', 'additionalProperties', 'example']) {
    if (sc[k] !== undefined) add('  ' + k + '=' + JSON.stringify(sc[k]));
  }
}

add('\n# COMPONENT PARAMETERS');
add(JSON.stringify(s.components.parameters, null, 1));

add('\n# SECURITY / SERVERS / INFO');
add(JSON.stringify({ info: s.info, servers: s.servers, security: s.security, securitySchemes: s.components.securitySchemes, tags: s.tags }, null, 1));

fs.writeFileSync('digest.txt', out.join('\n'), 'utf8');
console.log('wrote digest.txt', out.length, 'lines');
