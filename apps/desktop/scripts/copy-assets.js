const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../web/out');
const destDir = path.join(__dirname, '../web-dist');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying assets from', srcDir, 'to', destDir);
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
if (fs.existsSync(srcDir)) {
  copyRecursiveSync(srcDir, destDir);
  console.log('Frontend assets copied successfully');

  // Also copy backend sidecar
  const binSrc = path.join(__dirname, '../src-tauri/bin');
  const binDest = path.join(__dirname, '../api-bin');
  if (fs.existsSync(binSrc)) {
    console.log('Copying sidecar binaries from', binSrc, 'to', binDest);
    copyRecursiveSync(binSrc, binDest);
  }

  // Also copy built EXE to web/public for browser download (if it exists)
  const distDir = path.join(__dirname, '../dist');
  const publicDownloadDir = path.join(__dirname, '../../web/public/downloads');
  if (fs.existsSync(distDir)) {
    if (!fs.existsSync(publicDownloadDir)) {
      fs.mkdirSync(publicDownloadDir, { recursive: true });
    }
    const files = fs.readdirSync(distDir);
    const exeFile = files.find(f => f.endsWith('.exe') && !f.includes('blockmap'));
    if (exeFile) {
      console.log('Copying installer to web public downloads:', exeFile);
      fs.copyFileSync(
        path.join(distDir, exeFile),
        path.join(publicDownloadDir, 'dbms-platform-setup.exe')
      );
    }
  }
} else {
  console.error('Source directory does not exist:', srcDir);
  process.exit(1);
}
