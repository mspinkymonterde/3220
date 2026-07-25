module.exports = {
  apps: [
    {
      name: '3220-bot',
      script: 'dist/index.js',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
