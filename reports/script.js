// Sample user data (will be replaced with API data)
let users = [];

// Chart instances
let userStatusChart, userRolesChart, departmentChart, userGrowthChart, activityChart;

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication
  checkAuth();
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Load data from API
  await loadAnalyticsData();
  
  // Add loading animation
  document.body.classList.add('loaded');
});

function checkAuth() {
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    window.location.href = '../login/index.html';
    return;
  }
  
  document.getElementById('welcomeMessage').textContent = `Welcome, ${loggedInUser}!`;
}

// API Functions
async function loadAnalyticsData() {
  try {
    showLoading();
    
    // Load all analytics data in parallel
    const [usersResponse, statsResponse, departmentResponse, roleResponse, statusResponse, growthResponse, activityResponse] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/analytics/stats'),
      fetch('/api/analytics/users-by-department'),
      fetch('/api/analytics/users-by-role'),
      fetch('/api/analytics/users-by-status'),
      fetch('/api/analytics/user-growth'),
      fetch('/api/analytics/user-activity')
    ]);
    
    // Check for authentication errors
    if (usersResponse.status === 401 || statsResponse.status === 401) {
      sessionStorage.clear();
      window.location.href = '../login/index.html';
      return;
    }
    
    // Parse responses
    const usersData = await usersResponse.json();
    const statsData = await statsResponse.json();
    const departmentData = await departmentResponse.json();
    const roleData = await roleResponse.json();
    const statusData = await statusResponse.json();
    const growthData = await growthResponse.json();
    const activityData = await activityResponse.json();
    
    // Transform users data
    users = usersData.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      lastActive: formatLastActive(user.last_login),
      avatar: (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase(),
      sessions: Math.floor(Math.random() * 200) + 50, // Simulated data
      avgDuration: Math.floor(Math.random() * 30) + 15 + 'm' // Simulated data
    }));
    
    // Update statistics
    updateStatisticsFromAPI(statsData);
    
    // Initialize charts with API data
    initializeChartsWithData(departmentData, roleData, statusData, growthData, activityData);
    
    // Populate reports table
    populateReportsTable();
    
    hideLoading();
  } catch (error) {
    console.error('Error loading analytics data:', error);
    hideLoading();
    showNotification('Failed to load analytics data. Please refresh the page.', 'error');
  }
}

function formatLastActive(lastLogin) {
  if (!lastLogin) return 'Never';
  
  const now = new Date();
  const loginDate = new Date(lastLogin);
  const diffMs = now - loginDate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return loginDate.toLocaleDateString();
}

function updateStatisticsFromAPI(statsData) {
  document.getElementById('totalUsers').textContent = statsData.total_users || 0;
  document.getElementById('activeUsers').textContent = statsData.active_users || 0;
  document.getElementById('pendingUsers').textContent = statsData.pending_users || 0;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${getNotificationIcon(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: type === 'success' ? '#10b981' : 
                type === 'error' ? '#ef4444' : 
                '#6366f1',
    color: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: '1001',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    maxWidth: '300px'
  });
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return 'check-circle';
    case 'error': return 'exclamation-circle';
    case 'warning': return 'exclamation-triangle';
    default: return 'info-circle';
  }
}

function initializeEventListeners() {
  // Back button
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = '../mainPage/index.html';
  });
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', function() {
    const btn = this;
    btn.classList.add('loading');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing out...';
    
    setTimeout(() => {
      sessionStorage.removeItem('loggedInUser');
      window.location.href = '../login/index.html';
    }, 1000);
  });
  
  // Date range filter
  document.getElementById('dateRange').addEventListener('change', function() {
    showLoading();
    setTimeout(() => {
      updateAllData();
      hideLoading();
    }, 1500);
  });
  
  // Refresh data button
  document.getElementById('refreshData').addEventListener('click', function() {
    const btn = this;
    const icon = btn.querySelector('i');
    
    icon.classList.add('fa-spin');
    showLoading();
    
    setTimeout(() => {
      updateAllData();
      hideLoading();
      icon.classList.remove('fa-spin');
    }, 2000);
  });
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', function() {
    exportToCSV();
  });
  
  // Print button
  document.getElementById('printBtn').addEventListener('click', function() {
    window.print();
  });
}

function initializeChartsWithData(departmentData, roleData, statusData, growthData, activityData) {
  initUserStatusChart(statusData);
  initUserRolesChart(roleData);
  initDepartmentChart(departmentData);
  initUserGrowthChart(growthData);
  initActivityChart(activityData);
}

function updateStatistics() {
  // This function is now replaced by updateStatisticsFromAPI
  // Keep for backward compatibility
  const activeUsers = users.filter(user => user.status === 'active').length;
  const pendingUsers = users.filter(user => user.status === 'pending').length;
  const totalUsers = users.length;
  
  document.getElementById('totalUsers').textContent = totalUsers;
  document.getElementById('activeUsers').textContent = activeUsers;
  document.getElementById('pendingUsers').textContent = pendingUsers;
}

function initUserStatusChart(statusData = null) {
  const ctx = document.getElementById('userStatusChart').getContext('2d');
  
  let labels, data;
  if (statusData && statusData.length > 0) {
    labels = statusData.map(item => item.status.charAt(0).toUpperCase() + item.status.slice(1));
    data = statusData.map(item => item.count);
  } else {
    // Fallback to calculated data
    const statusCounts = {
      active: users.filter(u => u.status === 'active').length,
      pending: users.filter(u => u.status === 'pending').length,
      inactive: users.filter(u => u.status === 'inactive').length
    };
    labels = ['Active', 'Pending', 'Inactive'];
    data = [statusCounts.active, statusCounts.pending, statusCounts.inactive];
  }
  
  userStatusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function initUserRolesChart(roleData = null) {
  const ctx = document.getElementById('userRolesChart').getContext('2d');
  
  let labels, data;
  if (roleData && roleData.length > 0) {
    labels = roleData.map(item => item.role.charAt(0).toUpperCase() + item.role.slice(1));
    data = roleData.map(item => item.count);
  } else {
    // Fallback to calculated data
    const roleCounts = {
      admin: users.filter(u => u.role === 'admin').length,
      moderator: users.filter(u => u.role === 'moderator').length,
      user: users.filter(u => u.role === 'user').length
    };
    labels = ['Admin', 'Moderator', 'User'];
    data = [roleCounts.admin, roleCounts.moderator, roleCounts.user];
  }
  
  userRolesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#8b5cf6',
          '#3b82f6',
          '#10b981'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function initDepartmentChart(departmentData = null) {
  const ctx = document.getElementById('departmentChart').getContext('2d');
  
  let departments, counts;
  if (departmentData && departmentData.length > 0) {
    departments = departmentData.map(item => item.department);
    counts = departmentData.map(item => item.count);
  } else {
    // Fallback to calculated data
    const departmentCounts = {};
    users.forEach(user => {
      if (user.department) {
        departmentCounts[user.department] = (departmentCounts[user.department] || 0) + 1;
      }
    });
    departments = Object.keys(departmentCounts);
    counts = Object.values(departmentCounts);
  }
  
  departmentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: departments,
      datasets: [{
        label: 'Number of Users',
        data: counts,
        backgroundColor: [
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#ef4444',
          '#f59e0b',
          '#10b981',
          '#06b6d4',
          '#84cc16'
        ],
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed.y} users`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

function initUserGrowthChart() {
  const ctx = document.getElementById('userGrowthChart').getContext('2d');
  
  // Generate sample growth data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const growthData = [1, 2, 4, 5, 7, 8];
  
  userGrowthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Total Users',
        data: growthData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Total Users: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

function initActivityChart() {
  const ctx = document.getElementById('activityChart').getContext('2d');
  
  // Generate sample activity data
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const activityData = [85, 92, 78, 88, 95, 45, 32];
  
  activityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Activity Level (%)',
        data: activityData,
        backgroundColor: days.map((_, index) => {
          const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4'];
          return colors[index];
        }),
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Activity: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

function populateReportsTable() {
  const tableBody = document.getElementById('reportsTableBody');
  tableBody.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>
        <div class="user-info">
          <div class="user-avatar">${user.avatar}</div>
          <div class="user-details">
            <div class="user-name">${user.firstName} ${user.lastName}</div>
            <div class="user-email">${user.email}</div>
          </div>
        </div>
      </td>
      <td>${user.department}</td>
      <td><span class="role-badge role-${user.role}">${user.role}</span></td>
      <td><span class="status-badge status-${user.status}">${user.status}</span></td>
      <td>${user.lastActive}</td>
      <td>${user.sessions}</td>
      <td>${user.avgDuration}</td>
    `;
    
    tableBody.appendChild(row);
  });
}

function updateAllData() {
  updateStatistics();
  
  // Update charts
  if (userStatusChart) userStatusChart.update();
  if (userRolesChart) userRolesChart.update();
  if (departmentChart) departmentChart.update();
  if (userGrowthChart) userGrowthChart.update();
  if (activityChart) activityChart.update();
  
  populateReportsTable();
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function exportToCSV() {
  const headers = ['Name', 'Email', 'Department', 'Role', 'Status', 'Last Active', 'Sessions', 'Avg Duration'];
  const csvContent = [
    headers.join(','),
    ...users.map(user => [
      `"${user.firstName} ${user.lastName}"`,
      user.email,
      user.department,
      user.role,
      user.status,
      `"${user.lastActive}"`,
      user.sessions,
      user.avgDuration
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user-analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Utility functions for responsive charts
function handleChartResize() {
  const charts = [userStatusChart, userRolesChart, departmentChart, userGrowthChart, activityChart];
  charts.forEach(chart => {
    if (chart) {
      chart.resize();
    }
  });
}

// Handle window resize
window.addEventListener('resize', handleChartResize);

// Add chart action button functionality
document.addEventListener('click', function(e) {
  if (e.target.closest('.chart-action-btn')) {
    const btn = e.target.closest('.chart-action-btn');
    const action = btn.title;
    
    if (action === 'Download Chart') {
      // Find the chart canvas in the same container
      const chartContainer = btn.closest('.chart-container');
      const canvas = chartContainer.querySelector('canvas');
      
      if (canvas) {
        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } else if (action === 'Fullscreen') {
      // Toggle fullscreen for the chart container
      const chartContainer = btn.closest('.chart-container');
      
      if (!document.fullscreenElement) {
        chartContainer.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  }
});

// Performance optimization - lazy load charts when they come into view
const observerOptions = {
  threshold: 0.1,
  rootMargin: '50px'
};

const chartObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const chartId = entry.target.querySelector('canvas').id;
      // Charts are already initialized, but this could be used for lazy loading
      console.log(`Chart ${chartId} is in view`);
    }
  });
}, observerOptions);

// Observe all chart containers
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.chart-container').forEach(container => {
    chartObserver.observe(container);
  });
});
