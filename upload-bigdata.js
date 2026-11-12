const SftpClient = require('ssh2-sftp-client');

const config = {
  host: '172.16.179.2',
  port: 22,
  username: 'JSB-T',
  password: '!qaz2wsx',
};

(async () => {
  const sftp = new SftpClient();
  try {
    await sftp.connect(config);
    console.log(`Connected to ${config.host}`);
    const local = 'C:\\Users\\xjsww\\Desktop\\workspace\\bigdata-server\\app\\service\\bigdata.js';
    const remote = 'C:/wwwroot/bigdata-server/app/service/bigdata.js';
    await sftp.put(local, remote);
    console.log('bigdata.js uploaded successfully!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    sftp.end();
  }
})();