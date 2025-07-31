// Sample user data (imported from the users module)
let users = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'admin',
    status: 'active',
    department: 'IT',
    lastActive: '2 hours ago',
    avatar: 'JD',
    sessions: 145,
    avgDuration: '28m'
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    role: 'user',
    status: 'active',
    department: 'Marketing',
    lastActive: '1 day ago',
    avatar: 'JS',
    sessions: 89,
    avgDuration: '22m'
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    role: 'moderator',
    status: 'pending',
    department: 'Sales',
    lastActive: '3 days ago',
    avatar: 'MJ',
    sessions: 67,
    avgDuration: '18m'
  },
  {
    id: 4,
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@example.com',
    role: 'user',
    status: 'active',
    department: 'HR',
    lastActive: '5 minutes ago',
    avatar: 'SW',
    sessions: 203,
    avgDuration: '31m'
  },
  {
    id: 5,
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@example.com',
    role: 'user',
    status: 'inactive',
    department: 'Finance',
    lastActive: '1 week ago',
    avatar: 'DB',
    sessions: 34,
    avgDuration: '15m'
  },
  {
    id: 6,
    firstName: 'Emma',
    lastName: 'Davis',
    email: 'emma.davis@example.com',
    role: 'admin',
    status: 'active',
    department: 'IT',
    lastActive: '30 minutes ago',
    avatar: 'ED',
    sessions: 178,
    avgDuration: '35m'
  },
  {
    id: 7,
    firstName: 'Alex',
    lastName: 'Miller',
    email: 'alex.miller@example.com',
    role: 'user',
    status: 'pending',
    department: 'Design',
    lastActive: '2 days ago',
    avatar: 'AM',
    sessions: 56,
    avgDuration: '20m'
  },
  {
    id: 8,
    firstName: 'Lisa',
    lastName: 'Garcia',
    email: 'lisa.garcia@example.com',
    role: 'moderator',
    status: 'active',
    department: 'Support',
    lastActive: '1 hour ago',
    avatar: 'LG',
    sessions: 112,
    avgDuration: '26m'
  }
];

// Chart instances
let userStatusChart, userRolesChart, departmentChart, userGrowthChart, activityChart;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  checkAuth();
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Update statistics
  updateStatistics();
  
  // Initialize charts
  initializeCharts();
  
  // Populate reports table
  populateReportsTable();
  
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

function updateStatistics() {
  const activeUsers = users.filter(user => user.status === 'active').length;
  const pendingUsers = users.filter(user => user.status === 'pending').length;
  const totalUsers = users.length;
  
  document.getElementById('totalUsers').textContent = totalUsers;
  document.getElementById('activeUsers').textContent = activeUsers;
  document.getElementById('pendingUsers').textContent = pendingUsers;
}

function initializeCharts() {
  initUserStatusChart();
  initUserRolesChart();
  initDepartmentChart();
  initUserGrowthChart();
  initActivityChart();
}

function initUserStatusChart() {
  const ctx = document.getElementById('userStatusChart').getContext('2d');
  
  const statusCounts = {
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    inactive: users.filter(u => u.status === 'inactive').length
  };
  
  userStatusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Active', 'Pending', 'Inactive'],
      datasets: [{
        data: [statusCounts.active, statusCounts.pending, statusCounts.inactive],
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

function initUserRolesChart() {
  const ctx = document.getElementById('userRolesChart').getContext('2d');
  
  const roleCounts = {
    admin: users.filter(u => u.role === 'admin').length,
    moderator: users.filter(u => u.role === 'moderator').length,
    user: users.filter(u => u.role === 'user').length
  };
  
  userRolesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Admin', 'Moderator', 'User'],
      datasets: [{
        data: [roleCounts.admin, roleCounts.moderator, roleCounts.user],
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

function initDepartmentChart() {
  const ctx = document.getElementById('departmentChart').getContext('2d');
  
  const departmentCounts = {};
  users.forEach(user => {
    departmentCounts[user.department] = (departmentCounts[user.department] || 0) + 1;
  });
  
  const departments = Object.keys(departmentCounts);
  const counts = Object.values(departmentCounts);
  
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
