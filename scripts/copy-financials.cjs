const fs = require('node:fs');
fs.cpSync('frontend/public/financials', 'dist/financials', { recursive: true });
