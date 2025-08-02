const EventEmitter = require('events');

class FlakyTestNotificationService extends EventEmitter {
  constructor() {
    super();
    this.notifications = [];
    this.maxNotifications = 100;
    this.listeners = new Set();
  }

  /**
   * Add a new flaky test detection notification
   */
  addNotification(notification) {
    const notificationWithId = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };

    this.notifications.unshift(notificationWithId);

    // Keep only the latest notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Emit notification event
    this.emit('notification', notificationWithId);

    console.log(`📢 Flaky test notification: ${notification.title}`);
    return notificationWithId;
  }

  /**
   * Create notification for newly detected flaky test
   */
  notifyFlakyTestDetected(testName, flakyScore, classification) {
    const severity = this.getSeverityFromScore(flakyScore);
    
    return this.addNotification({
      type: 'flaky_test_detected',
      severity,
      title: `Flaky Test Detected: ${testName}`,
      message: `Test "${testName}" has been classified as ${classification} with a flaky score of ${(flakyScore * 100).toFixed(1)}%.`,
      testName,
      flakyScore,
      classification,
      actionRequired: flakyScore > 0.7,
      actions: [
        {
          label: 'View Details',
          url: `/flaky-tests?test=${encodeURIComponent(testName)}`
        },
        {
          label: 'Analyze Test',
          action: 'analyze_test',
          testName
        }
      ]
    });
  }

  /**
   * Create notification for test that has become stable
   */
  notifyTestStabilized(testName, previousScore, newScore) {
    return this.addNotification({
      type: 'test_stabilized',
      severity: 'success',
      title: `Test Stabilized: ${testName}`,
      message: `Test "${testName}" has improved from ${(previousScore * 100).toFixed(1)}% to ${(newScore * 100).toFixed(1)}% flaky score.`,
      testName,
      previousScore,
      newScore,
      actionRequired: false,
      actions: [
        {
          label: 'View Details',
          url: `/flaky-tests?test=${encodeURIComponent(testName)}`
        }
      ]
    });
  }

  /**
   * Create notification for analysis completion
   */
  notifyAnalysisCompleted(analysisResult) {
    const flakyCount = analysisResult.flakyTests;
    const potentiallyFlakyCount = analysisResult.potentiallyFlakyTests;
    const totalIssues = flakyCount + potentiallyFlakyCount;

    let severity = 'info';
    if (flakyCount > 5) severity = 'error';
    else if (totalIssues > 10) severity = 'warning';
    else if (totalIssues > 5) severity = 'warning';

    return this.addNotification({
      type: 'analysis_completed',
      severity,
      title: 'Flaky Test Analysis Completed',
      message: `Analysis found ${flakyCount} flaky tests and ${potentiallyFlakyCount} potentially flaky tests out of ${analysisResult.totalTests} total tests.`,
      analysisResult,
      actionRequired: totalIssues > 0,
      actions: [
        {
          label: 'View Dashboard',
          url: '/flaky-tests'
        },
        ...(totalIssues > 0 ? [{
          label: 'Review Issues',
          url: '/flaky-tests?filter=flaky'
        }] : [])
      ]
    });
  }

  /**
   * Create notification for threshold breaches
   */
  notifyThresholdBreach(metric, currentValue, threshold, description) {
    return this.addNotification({
      type: 'threshold_breach',
      severity: 'error',
      title: `Threshold Breach: ${metric}`,
      message: `${description} Current value: ${currentValue}, Threshold: ${threshold}`,
      metric,
      currentValue,
      threshold,
      actionRequired: true,
      actions: [
        {
          label: 'View Dashboard',
          url: '/flaky-tests'
        },
        {
          label: 'Run Analysis',
          action: 'run_analysis'
        }
      ]
    });
  }

  /**
   * Get all notifications
   */
  getNotifications(limit = 50, unreadOnly = false) {
    let notifications = this.notifications;
    
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    return notifications.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emit('notification_read', notification);
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    let count = 0;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    });
    
    if (count > 0) {
      this.emit('all_notifications_read', count);
    }
    
    return count;
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const originalLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => 
      new Date(n.timestamp) > cutoffDate
    );
    
    const removedCount = originalLength - this.notifications.length;
    
    if (removedCount > 0) {
      console.log(`🧹 Cleared ${removedCount} old notifications`);
    }
    
    return removedCount;
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get severity from flaky score
   */
  getSeverityFromScore(flakyScore) {
    if (flakyScore >= 0.7) return 'error';
    if (flakyScore >= 0.4) return 'warning';
    if (flakyScore >= 0.2) return 'info';
    return 'success';
  }

  /**
   * Subscribe to notifications
   */
  subscribe(callback) {
    this.listeners.add(callback);
    this.on('notification', callback);
    
    return () => {
      this.listeners.delete(callback);
      this.off('notification', callback);
    };
  }

  /**
   * Check for notification triggers based on analysis results
   */
  checkNotificationTriggers(analysisResults) {
    const triggers = [];

    // Check for high flaky test count
    const flakyCount = analysisResults.flakyTests;
    if (flakyCount > 5) {
      triggers.push({
        type: 'high_flaky_count',
        severity: 'error',
        message: `High number of flaky tests detected: ${flakyCount}`
      });
    }

    // Check for degradation in test stability
    const totalIssues = analysisResults.flakyTests + analysisResults.potentiallyFlakyTests;
    const totalTests = analysisResults.totalTests;
    const issuePercentage = (totalIssues / totalTests) * 100;

    if (issuePercentage > 20) {
      triggers.push({
        type: 'stability_degradation',
        severity: 'warning',
        message: `${issuePercentage.toFixed(1)}% of tests are showing stability issues`
      });
    }

    // Generate notifications for triggers
    triggers.forEach(trigger => {
      this.addNotification({
        type: trigger.type,
        severity: trigger.severity,
        title: 'Test Stability Alert',
        message: trigger.message,
        actionRequired: true,
        actions: [
          {
            label: 'View Dashboard',
            url: '/flaky-tests'
          }
        ]
      });
    });

    return triggers;
  }
}

module.exports = FlakyTestNotificationService;