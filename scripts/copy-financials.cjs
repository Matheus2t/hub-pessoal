const fs = require('node:fs');
fs.cpSync('frontend/public/financials', 'dist/financials', { recursive: true });
fs.cpSync('frontend/public/teams', 'dist/teams', { recursive: true });

fs.cpSync('frontend/public/learn', 'dist/learn', { recursive: true });
