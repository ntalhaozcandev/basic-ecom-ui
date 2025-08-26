/*
Builds a GitHub Pages-ready `docs/` folder from src/ by:
- copying styles, scripts, images
- promoting src/pages/home.html to docs/index.html
- copying all other html pages to docs/
- normalizing asset paths: ../styles|scripts|images -> styles|scripts|images
- removing leading slashes from href/src so it works under /<repo>/
- creating .nojekyll
*/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcDir = path.join(root, 'src');
const pagesDir = path.join(srcDir, 'pages');
const outDir = path.join(root, 'docs');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function transformHtml(content) {
  // ../styles -> styles, same for scripts/images
  content = content.replace(/(href|src)="\.\.\/(styles|scripts|images)\//g, '$1="$2/');
  // remove leading slash for assets/links
  content = content.replace(/(href|src)="\//g, '$1="');
  // ensure logo/home links point to index.html (we don't publish a separate home.html)
  content = content.replace(/href\s*=\s*"home\.html"/g, 'href="index.html"');
  // Optional: base href could be injected if needed
  return content;
}

function writeFile(p, data) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, data);
}

function main() {
  // Reset output
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  // Copy static assets
  for (const dir of ['styles', 'scripts', 'images']) {
    const s = path.join(srcDir, dir);
    if (fs.existsSync(s)) copyDir(s, path.join(outDir, dir));
  }

  // Copy and transform pages
  const htmlFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const srcPath = path.join(pagesDir, file);
    let html = fs.readFileSync(srcPath, 'utf8');
    html = transformHtml(html);

    // home.html -> index.html
    const outName = file === 'home.html' ? 'index.html' : file;
    const destPath = path.join(outDir, outName);
    writeFile(destPath, html);
  }

  // .nojekyll
  writeFile(path.join(outDir, '.nojekyll'), '');

  console.log('Built docs/ for GitHub Pages.');
}

main();
