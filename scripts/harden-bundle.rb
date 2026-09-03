#!/usr/bin/env ruby

require "json"

path = ARGV.fetch(0, "index.html")
html = File.read(path, encoding: "UTF-8")
match = html.match(%r{(<script type="__bundler/template">\s*)(.*?)(\s*</script>)}m)
abort "Could not find the bundled page template" unless match

template = JSON.parse(match[2])

def indent_js(text)
  text.lines.map { |line| "  #{line}" }.join.chomp
end

replacements = {
  "import * as THREE from 'three';" => <<~'NEW'.chomp,
    import * as THREE from 'three';
    import { qrcode } from './assets/qrcode.mjs';
  NEW
  indent_js(<<~'OLD') => indent_js(<<~'NEW'),
      .actions { display: flex; gap: var(--space-2); margin-top: auto; padding-top: var(--space-4); border-top: 2px solid var(--color-divider); }
    OLD
      .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: auto; padding-top: var(--space-4); border-top: 2px solid var(--color-divider); }
      .qr-backdrop[hidden] { display: none; }
      .qr-backdrop { position: fixed; inset: 0; z-index: 20000; display: grid; place-items: center; padding: var(--space-4); background: color-mix(in srgb, var(--color-neutral-900) 58%, transparent); }
      .qr-dialog { position: relative; width: min(420px, 100%); padding: var(--space-6); background: var(--color-bg); border: 2px solid var(--color-text); box-shadow: var(--shadow-lg); }
      .qr-dialog h2 { margin: 2px 40px var(--space-3) 0; font-size: 24px; }
      .qr-close { position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; border: 0; background: transparent; color: var(--color-text); font: 26px/1 var(--font-body); cursor: pointer; }
      .qr-code { display: grid; place-items: center; padding: var(--space-4); background: #fff; border: 1px solid var(--color-divider); }
      .qr-code svg { display: block; width: min(280px, 68vw); height: auto; }
      .qr-url { max-height: 58px; margin: var(--space-3) 0 0; overflow: auto; word-break: break-all; font: 10px/1.35 ui-monospace, monospace; color: var(--color-neutral-700); }
      .qr-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); }
    NEW
  indent_js(<<~'OLD') => indent_js(<<~'NEW'),
      <div class="actions">
        <button class="btn btn-primary" id="share" type="button">Copy link for customer</button>
        <button class="btn btn-secondary" id="play" type="button" aria-pressed="true">Pause</button>
        <button class="btn btn-ghost" id="reset" type="button">Reset</button>
      </div>
    OLD
      <div class="actions">
        <button class="btn btn-primary" id="share" type="button">Copy link for customer</button>
        <button class="btn btn-secondary" id="qr" type="button">QR customer link</button>
        <button class="btn btn-secondary" id="play" type="button" aria-pressed="true">Pause</button>
        <button class="btn btn-ghost" id="reset" type="button">Reset</button>
      </div>
    NEW
  "</aside>\n<div class=\"viewport\">" => <<~'NEW'.chomp,
    </aside>
    <div class="qr-backdrop" id="qrDialog" hidden>
      <section class="qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
        <button class="qr-close" id="qrClose" type="button" aria-label="Close QR code">&times;</button>
        <p class="kicker">Customer link</p>
        <h2 id="qrTitle">Scan to open this layout</h2>
        <div class="qr-code" id="qrCode" aria-label="QR code for the customer layout"></div>
        <p class="qr-url" id="qrUrl"></p>
        <div class="qr-actions">
          <button class="btn btn-secondary" id="qrCopy" type="button">Copy link</button>
          <button class="btn btn-primary" id="qrDownload" type="button">Download QR (SVG)</button>
        </div>
      </section>
    </div>
    <div class="viewport">
  NEW
  indent_js(<<~'OLD') => indent_js(<<~'NEW'),
      const textIds = ['project', 'liftNo', 'location', 'modelName'];
      const numeric = (id) => id !== 'doorType';
    OLD
      const textIds = ['project', 'liftNo', 'location', 'modelName'];
      const encodeConfig = (value) => {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      };
      const decodeConfig = (value) => {
        const base64 = value.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
      };
      const numeric = (id) => id !== 'doorType';
    NEW
  indent_js(<<~'OLD') => indent_js(<<~'NEW'),
      try { const c = new URLSearchParams(location.search).get('c'); if (c) { const o = JSON.parse(atob(c)); if (o.doorType) { document.getElementById('doorType').value = o.doorType; syncPanels(+o.doorPanels || 2); } [...ids, ...textIds].forEach(id => { if (o[id] != null) document.getElementById(id).value = o[id]; }); if (Array.isArray(o.floorHeights)) { syncFloorListFrom(o.floorHeights); } } } catch (e) {}
    OLD
      try { const c = new URLSearchParams(location.search).get('c'); if (c) { const o = decodeConfig(c); if (o.doorType) { document.getElementById('doorType').value = o.doorType; syncPanels(+o.doorPanels || 2); } [...ids, ...textIds].forEach(id => { if (o[id] != null) document.getElementById(id).value = o[id]; }); if (Array.isArray(o.floorHeights)) { syncFloorListFrom(o.floorHeights); } } } catch (e) {}
    NEW
  indent_js(<<~'OLD') => indent_js(<<~'NEW'),
      function syncFloorListFrom(arr) { floorlist.innerHTML = ''; arr.forEach((v, i) => floorlist.insertAdjacentHTML('beforeend', `<div class="field"><label for="fh${i}">Floor ${i + 1} → ${i + 2}</label><div class="unit" data-unit="mm"><input class="input" id="fh${i}" type="number" min="2600" max="8000" step="50" value="${v}" form="f"></div></div>`)); }
    OLD
      function syncFloorListFrom(arr) { floorlist.innerHTML = ''; arr.forEach((rawValue, i) => { const v = Number(rawValue); if (!Number.isFinite(v)) return; floorlist.insertAdjacentHTML('beforeend', `<div class="field"><label for="fh${i}">Floor ${i + 1} → ${i + 2}</label><div class="unit" data-unit="mm"><input class="input" id="fh${i}" type="number" min="2600" max="8000" step="50" value="${v}" form="f"></div></div>`); }); }
    NEW
  "    const code = btoa(JSON.stringify({ ...raw, floorHeights: P.floorHeights }));" =>
    "    const code = encodeConfig({ ...raw, floorHeights: P.floorHeights });",
  indent_js(<<~'OLD') => indent_js(<<~'NEW')
      const toast = document.getElementById('toast');
      document.getElementById('share').onclick = async () => {
        const url = shareUrl;
        try { await navigator.clipboard.writeText(url); toast.textContent = 'Link copied — send it to the customer'; }
        catch (e) { prompt('Copy this link', url); return; }
        toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200);
      };
    OLD
      const toast = document.getElementById('toast');
      const qrDialog = document.getElementById('qrDialog'), qrMount = document.getElementById('qrCode'), qrUrl = document.getElementById('qrUrl');
      const qrClose = document.getElementById('qrClose'), qrCopy = document.getElementById('qrCopy'), qrDownload = document.getElementById('qrDownload');
      let qrSvg = '', toastTimer;
      const showToast = (message) => {
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
      };
      const copyCustomerLink = async () => {
        try { await navigator.clipboard.writeText(shareUrl); showToast('Link copied — send it to the customer'); }
        catch (e) { prompt('Copy this link', shareUrl); }
      };
      const closeQr = () => { qrDialog.hidden = true; document.getElementById('qr').focus(); };
      const openQr = () => {
        try {
          const code = qrcode(0, 'M');
          code.addData(shareUrl, 'Byte');
          code.make();
          qrSvg = code.createSvgTag(6, 4, 'QR code for the customer layout', 'Scan to open this engineering sizing layout');
          qrMount.innerHTML = qrSvg;
          qrUrl.textContent = shareUrl;
          qrDialog.hidden = false;
          qrClose.focus();
        } catch (error) {
          console.error('QR generation failed', error);
          showToast('QR code could not be generated');
        }
      };
      document.getElementById('share').onclick = copyCustomerLink;
      document.getElementById('qr').onclick = openQr;
      qrCopy.onclick = copyCustomerLink;
      qrClose.onclick = closeQr;
      qrDialog.addEventListener('click', (event) => { if (event.target === qrDialog) closeQr(); });
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !qrDialog.hidden) closeQr(); });
      qrDownload.onclick = () => {
        if (!qrSvg) return;
        const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', qrSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        const projectName = document.getElementById('project').value.trim();
        const safeName = projectName.normalize('NFKD').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'elevator-layout';
        link.href = url; link.download = `${safeName}-customer-qr.svg`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    NEW
}

replacements.each do |old_text, new_text|
  count = template.scan(old_text).length
  abort "Expected one match, found #{count}: #{old_text.lines.first.strip}" unless count == 1
  # The block form keeps JavaScript backslashes literal. A replacement string
  # would interpret sequences such as `\+` as Ruby replacement backreferences.
  template.sub!(old_text) { new_text }
end

# Avoid closing the outer custom script tag while storing the template as JSON.
encoded_template = JSON.generate(template).gsub("</", "<\\u002F")
patched = html[0...match.begin(2)] + encoded_template + html[match.end(2)..]
File.write(path, patched, mode: "w", encoding: "UTF-8")

puts "Hardened #{path}"
