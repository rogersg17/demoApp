import React from 'react';
import { Container, Typography, Box } from '@mui/material';

interface MVPDashboardProps {
  onNavigate?: (page: string) => void;
}

const MVPDashboard: React.FC<MVPDashboardProps> = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          MVP Dashboard
        </Typography>
        
        <Typography variant="body1">
          Dashboard is ready for configuration and real-time monitoring.
        </Typography>
      </Box>
    </Container>
  );
};

export default MVPDashboard;
