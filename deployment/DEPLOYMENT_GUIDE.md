# Test Management Platform - Production Deployment Guide

## 🚀 Production Deployment Checklist

### Pre-Deployment Requirements
- [ ] Docker and Docker Compose installed on production server
- [ ] SSL certificates obtained and configured (optional for initial deployment)
- [ ] Production environment variables configured
- [ ] Database backup procedures tested
- [ ] Monitoring and alerting systems ready

### Deployment Steps

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y

# Create deployment directory
sudo mkdir -p /opt/tms-mvp
sudo chown $USER:$USER /opt/tms-mvp
```

#### 2. Application Deployment
```bash
# Clone or copy application files
cd /opt/tms-mvp
git clone <repository-url> .

# Navigate to deployment directory
cd deployment

# Review and update production.env file
cp production.env.example production.env
nano production.env

# Build and start services
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f tms-app
```

#### 3. Database Migration
```bash
# Run database migration
docker-compose exec tms-app ./deployment/migrate-database.sh

# Verify database
docker-compose exec tms-app sqlite3 /app/data/app.db ".tables"
```

#### 4. Health Verification
```bash
# Check application health
curl http://localhost:3000/api/health

# Check all services
docker-compose ps
```

### Post-Deployment Configuration

#### JIRA Integration Setup
1. Log into the TMS dashboard at `http://your-server/`
2. Navigate to Configuration → JIRA Settings
3. Enter JIRA server URL and authentication credentials
4. Test connection and save configuration

#### Azure DevOps Integration Setup
1. Navigate to Configuration → Azure DevOps Settings
2. Enter ADO organization URL and personal access token
3. Select projects and build definitions to monitor
4. Configure pipeline monitoring settings

#### Pipeline Configuration
1. Go to Dashboard → Add Pipeline
2. Select ADO organization and project
3. Choose build definitions to monitor
4. Configure failure notification rules
5. Set JIRA project for issue creation

### Monitoring and Maintenance

#### Health Checks
- Application health: `http://your-server/api/health`
- Database integrity: Run weekly integrity checks
- Log monitoring: Check `/app/logs/tms.log` for errors

#### Backup Procedures
- Database: Automated daily backups to `/app/backups/`
- Configuration: Backup `production.env` and custom settings
- Application: Version control for code changes

#### Performance Monitoring
- Monitor response times via `/api/health` endpoint
- Check resource usage: `docker stats`
- Review logs for errors and warnings

### Troubleshooting

#### Common Issues
1. **Application won't start**: Check environment variables and Docker logs
2. **Database connection errors**: Verify database migration completed
3. **JIRA/ADO connectivity**: Test API credentials and network access
4. **WebSocket issues**: Check reverse proxy configuration

#### Support Resources
- Application logs: `docker-compose logs tms-app`
- System logs: `journalctl -u docker`
- Health endpoint: `curl http://localhost:3000/api/health`

### Security Considerations

#### Production Security
- [ ] Change default session secret in production.env
- [ ] Configure CORS origins for production domain
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up firewall rules for required ports only
- [ ] Regular security updates for base images

#### Access Control
- [ ] Limit SSH access to production server
- [ ] Use secure passwords for all accounts
- [ ] Implement backup encryption
- [ ] Regular security audits

### Rollback Procedures

#### Emergency Rollback
```bash
# Stop current deployment
docker-compose down

# Restore previous version
git checkout <previous-stable-tag>
docker-compose up -d

# Restore database if needed
cp /app/backups/app_backup_YYYYMMDD_HHMMSS.db /app/data/app.db
```

### Support and Maintenance

#### Regular Maintenance Tasks
- Weekly: Review logs and performance metrics
- Monthly: Update dependencies and security patches
- Quarterly: Full system backup and disaster recovery test

#### Contact Information
- Development Team: [team-email]
- Infrastructure Team: [infra-email]
- Emergency Contact: [emergency-contact]
