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
    "    const code = encodeConfig({ ...raw, floorHeights: P.floorHeights });"
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
