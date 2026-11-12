const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

const config = {
  host: '172.16.179.2',
  port: 22,
  username: 'JSB-T',
  password: '!qaz2wsx',
};

const localBase = 'C:\\Users\\xjsww\\Desktop\\workspace\\bigdata-server';
const remoteBase = 'C:\\wwwroot\\bigdata-server';

async function uploadFile(sftp, localPath, relPath) {
  const remotePath = path.join(remoteBase, relPath).replace(/\\/g, '/');
  await sftp.put(localPath, remotePath);
  console.log(`  ${relPath}`);
}

async function walkDir(dir, baseDir) {
  const exclude = ['node_modules', 'logs', 'run', 'test', 'typings', '.git', '.github'];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('.') || name.startsWith('~$') || exclude.includes(name)) continue;
    if (name.endsWith('.pptx') || name === 'README.md') continue;
    if (name.startsWith('test-') && name.endsWith('.js')) continue;
    const full = path.join(dir, name);
    if (entry.isDirectory()) {
      files.push(...await walkDir(full, baseDir));
    } else {
      files.push(path.relative(baseDir, full));
    }
  }
  return files;
}

(async () => {
  const sftp = new SftpClient();
  try {
    await sftp.connect(config);
    console.log(`Connected to ${config.host}`);

    const files = await walkDir(localBase, localBase);
    console.log(`Uploading ${files.length} files...`);

    for (const rel of files) {
      await uploadFile(sftp, path.join(localBase, rel), rel);
    }

    console.log('Backend uploaded successfully!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    sftp.end();
  }
})();