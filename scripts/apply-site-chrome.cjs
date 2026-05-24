/**
 * Substitui header/footer inline por placeholders (uso único / manutenção).
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const SKIP = new Set(['404.html']);

for (const name of fs.readdirSync(PUBLIC)) {
  if (!name.endsWith('.html') || SKIP.has(name)) continue;
  const filePath = path.join(PUBLIC, name);
  let html = fs.readFileSync(filePath, 'utf8');
  if (!/<header class="header/.test(html)) {
    console.log('skip (sem header):', name);
    continue;
  }
  html = html.replace(/<header class="header[\s\S]*?<\/header>/, '  <div data-site-chrome="header"></div>');
  html = html.replace(/<footer class="footer">[\s\S]*?<\/footer>/, '  <div data-site-chrome="footer"></div>');
  if (!html.includes('site-chrome.js')) {
    html = html.replace(
      /(<script src="js\/)/,
      '<script src="js/site-chrome.js"></script>\n  $1'
    );
  }
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('ok:', name);
}
