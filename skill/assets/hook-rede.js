(() => {
  if (window.__sigmaCap) return 'hook ja instalado';

  const MAX = 300;
  const TRUNC = 4096;
  const SENSIVEL = /(authorization|token|api[_-]?key|senha|password|secret|cookie|set-cookie|cpf|cnpj|e-?mail|telefone|phone|whatsapp)/i;

  const redigirURL = (u) => String(u || '').replace(
    /([?&](?:token|api[_-]?key|key|senha|password|auth|secret)=)[^&#]*/gi,
    '$1***'
  );

  const redigirTexto = (txt) => {
    if (typeof txt !== 'string') return txt;
    let s = txt;
    try {
      s = JSON.stringify(redigirObj(JSON.parse(s)));
    } catch (e) {
      s = s.replace(
        /("?(?:authorization|token|api[_-]?key|senha|password|secret|cookie|cpf|cnpj|e-?mail|telefone|phone|whatsapp)"?\s*[:=]\s*)("?)([^",}&\s]+)/gi,
        '$1$2***'
      );
    }
    return String(s).slice(0, TRUNC);
  };

  const redigirObj = (v) => {
    if (Array.isArray(v)) return v.map(redigirObj);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) out[k] = SENSIVEL.test(k) ? '***' : redigirObj(v[k]);
      return out;
    }
    if (typeof v === 'string') return redigirTexto(v);
    return v;
  };

  const headersParaObjeto = (h) => {
    if (!h) return {};
    try { return Object.fromEntries(new Headers(h).entries()); } catch (e) { return {}; }
  };

  const cap = [];
  window.__sigmaCap = cap;
  const push = (e) => {
    cap.push(e);
    if (cap.length > MAX) cap.shift();
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const cfg = init || {};
    const req = input;
    const url = typeof req === 'string' ? req : (req && req.url) || '';
    const method = String((cfg.method || (req && req.method) || 'GET')).toUpperCase();
    let corpo = cfg.body;
    if (corpo && typeof corpo !== 'string') {
      try { corpo = JSON.stringify(corpo); } catch (e) { corpo = '[corpo nao textual]'; }
    }
    const reg = {
      tipo: 'fetch',
      method,
      url: redigirURL(url),
      reqHeaders: redigirObj(headersParaObjeto(cfg.headers || (req && req.headers))),
      reqBody: redigirTexto(corpo || ''),
      ts: new Date().toISOString()
    };
    push(reg);
    const t0 = performance.now();
    return origFetch.apply(this, arguments).then((resp) => {
      reg.status = resp.status;
      reg.respHeaders = redigirObj(headersParaObjeto(resp.headers));
      resp.clone().text().then((txt) => {
        reg.respBody = redigirTexto(txt);
        reg.ms = Math.round(performance.now() - t0);
      }).catch(() => { reg.respBody = '[corpo nao textual]'; });
      return resp;
    }).catch((err) => {
      reg.erro = String((err && err.message) || err);
      throw err;
    });
  };

  const XP = XMLHttpRequest.prototype;
  if (!XP.__sigmaHook) {
    XP.__sigmaHook = true;
    const xOpen = XP.open;
    const xSend = XP.send;
    XP.open = function (method, url) {
      this.__sigma = {
        tipo: 'xhr',
        method: String(method).toUpperCase(),
        url: redigirURL(url),
        ts: new Date().toISOString()
      };
      return xOpen.apply(this, arguments);
    };
    XP.send = function (body) {
      const reg = this.__sigma || { tipo: 'xhr', ts: new Date().toISOString() };
      if (body) reg.reqBody = redigirTexto(typeof body === 'string' ? body : '[corpo nao textual]');
      const t0 = performance.now();
      this.addEventListener('load', () => {
        reg.status = this.status;
        reg.respBody = redigirTexto(this.responseText || '');
        reg.ms = Math.round(performance.now() - t0);
        push(reg);
      });
      this.addEventListener('error', () => {
        reg.erro = 'network';
        push(reg);
      });
      return xSend.apply(this, arguments);
    };
  }

  return 'hook instalado';
})()
