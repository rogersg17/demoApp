const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static('.'));

// Route for root - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login/index.html');
});

// Catch-all route for SPA behavior
app.get('*', (req, res) => {
  // If the request is for a static file that doesn't exist, send 404
  if (req.path.includes('.')) {
    res.status(404).send('File not found');
  } else {
    // For non-file requests, redirect to login (could be enhanced for SPA routing)
    res.redirect('/login/index.html');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Demo App server running at http://localhost:${PORT}`);
  console.log(`📱 Login page: http://localhost:${PORT}/login/index.html`);
  console.log(`👥 User Management: http://localhost:${PORT}/users/index.html`);
  console.log('✨ Press Ctrl+C to stop the server');
});
