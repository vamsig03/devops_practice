module.exports = {
  apps: [{
    name: 'launchpad-api',
    script: 'src/server.js',
    cwd: './backend',
    env: { NODE_ENV: 'production' }
  }]
};

