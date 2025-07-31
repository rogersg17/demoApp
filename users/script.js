// Sample user data
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
    avatar: 'JD'
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
    avatar: 'JS'
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
    avatar: 'MJ'
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
    avatar: 'SW'
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
    avatar: 'DB'
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
    avatar: 'ED'
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
    avatar: 'AM'
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
    avatar: 'LG'
  }
];

let filteredUsers = [...users];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  checkAuth();
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Render initial data
  renderUsers();
  updateStats();
  
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
  
  // Search functionality
  document.getElementById('searchUsers').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    filterUsers(searchTerm);
  });
  
  // Filter functionality
  document.getElementById('statusFilter').addEventListener('change', function() {
    applyFilters();
  });
  
  document.getElementById('roleFilter').addEventListener('change', function() {
    applyFilters();
  });
  
  // Add user modal
  document.getElementById('addUserBtn').addEventListener('click', function() {
    showModal();
  });
  
  document.getElementById('closeModal').addEventListener('click', function() {
    hideModal();
  });
  
  document.getElementById('cancelBtn').addEventListener('click', function() {
    hideModal();
  });
  
  // Modal backdrop click
  document.getElementById('addUserModal').addEventListener('click', function(e) {
    if (e.target === this) {
      hideModal();
    }
  });
  
  // Add user form
  document.getElementById('addUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    addUser();
  });
  
  // Delete modal event listeners
  document.getElementById('closeDeleteModal').addEventListener('click', function() {
    hideDeleteModal();
  });
  
  document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
    hideDeleteModal();
  });
  
  // Delete modal backdrop click
  document.getElementById('deleteUserModal').addEventListener('click', function(e) {
    if (e.target === this) {
      hideDeleteModal();
    }
  });
  
  // Select all checkbox
  document.getElementById('selectAll').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.users-table tbody .checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.checked;
    });
  });
}

function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  
  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr role="row">
        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);" role="cell">
          <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block;" aria-hidden="true"></i>
          No users found matching your criteria
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredUsers.map(user => `
    <tr data-user-id="${user.id}" role="row">
      <td role="cell">
        <input 
          type="checkbox" 
          class="checkbox" 
          data-user-id="${user.id}"
          aria-label="Select ${user.firstName} ${user.lastName}"
          title="Select this user">
      </td>
      <td role="cell">
        <div class="user-info">
          <div class="user-avatar" role="img" aria-label="Avatar for ${user.firstName} ${user.lastName}">${user.avatar}</div>
          <div class="user-details">
            <h4>${user.firstName} ${user.lastName}</h4>
            <p>${user.department}</p>
          </div>
        </div>
      </td>
      <td role="cell">
        <span class="user-email">${user.email}</span>
      </td>
      <td role="cell">
        <span class="role-badge" role="img" aria-label="Role: ${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
      </td>
      <td role="cell">
        <span class="status-badge ${user.status}" role="img" aria-label="Status: ${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
      </td>
      <td role="cell">
        <span class="last-active" aria-label="Last active: ${user.lastActive}">${user.lastActive}</span>
      </td>
      <td role="cell">
        <div class="actions" role="group" aria-label="User actions for ${user.firstName} ${user.lastName}">
          <button 
            class="action-btn edit" 
            onclick="editUser(${user.id})" 
            title="Edit ${user.firstName} ${user.lastName}"
            aria-label="Edit user ${user.firstName} ${user.lastName}"
            role="button"
            type="button">
            <i class="fas fa-edit" aria-hidden="true"></i>
          </button>
          <button 
            class="action-btn delete" 
            onclick="deleteUser(${user.id})" 
            title="Delete ${user.firstName} ${user.lastName}"
            aria-label="Delete user ${user.firstName} ${user.lastName}"
            role="button"
            type="button">
            <i class="fas fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Add row animations
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    row.style.animationDelay = `${index * 0.05}s`;
    row.classList.add('fade-in-row');
  });
}

function updateStats() {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const pendingUsers = users.filter(user => user.status === 'pending').length;
  const inactiveUsers = users.filter(user => user.status === 'inactive').length;
  
  // Animate number changes
  animateNumber('totalUsers', totalUsers);
  animateNumber('activeUsers', activeUsers);
  animateNumber('pendingUsers', pendingUsers);
  animateNumber('inactiveUsers', inactiveUsers);
}

function animateNumber(elementId, targetNumber) {
  const element = document.getElementById(elementId);
  const startNumber = parseInt(element.textContent) || 0;
  const duration = 1000;
  const steps = 30;
  const increment = (targetNumber - startNumber) / steps;
  let currentStep = 0;
  
  const timer = setInterval(() => {
    currentStep++;
    const currentNumber = Math.round(startNumber + (increment * currentStep));
    element.textContent = currentNumber;
    
    if (currentStep >= steps) {
      element.textContent = targetNumber;
      clearInterval(timer);
    }
  }, duration / steps);
}

function filterUsers(searchTerm) {
  filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.firstName.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.department.toLowerCase().includes(searchTerm);
    
    return matchesSearch;
  });
  
  applyFilters();
}

function applyFilters() {
  const statusFilter = document.getElementById('statusFilter').value;
  const roleFilter = document.getElementById('roleFilter').value;
  const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
  
  filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.firstName.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.department.toLowerCase().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });
  
  renderUsers();
}

function showModal() {
  const modal = document.getElementById('addUserModal');
  modal.classList.add('show');
  modal.style.display = 'flex';
  
  // Focus first input
  setTimeout(() => {
    document.getElementById('firstName').focus();
  }, 300);
}

function hideModal() {
  const modal = document.getElementById('addUserModal');
  modal.classList.remove('show');
  
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('addUserForm').reset();
  }, 300);
}

function hideDeleteModal() {
  const modal = document.getElementById('deleteUserModal');
  modal.classList.remove('show');
  
  // Reset confirm button state
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete User';
  confirmDeleteBtn.disabled = false;
  confirmDeleteBtn.onclick = null; // Remove event listener
}

function addUser() {
  const form = document.getElementById('addUserForm');
  const formData = new FormData(form);
  
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const department = document.getElementById('department').value.trim();
  const status = document.getElementById('status').value;
  
  if (!firstName || !lastName || !email || !role) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Check if email already exists
  if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
    showNotification('Email address already exists', 'error');
    return;
  }
  
  const newUser = {
    id: users.length + 1,
    firstName,
    lastName,
    email,
    role,
    status,
    department: department || 'General',
    lastActive: 'Just created',
    avatar: (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  };
  
  users.push(newUser);
  filteredUsers = [...users];
  
  renderUsers();
  updateStats();
  hideModal();
  
  showNotification('User added successfully!', 'success');
}

function editUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  // For demo purposes, just show an alert
  showNotification(`Edit functionality for ${user.firstName} ${user.lastName} would be implemented here`, 'info');
}

function deleteUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  // Show custom delete confirmation modal
  const deleteModal = document.getElementById('deleteUserModal');
  const deleteUserName = document.getElementById('deleteUserName');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  
  // Set user name in modal
  deleteUserName.textContent = `${user.firstName} ${user.lastName}`;
  
  // Show modal with proper centering
  deleteModal.classList.add('show');
  
  // Handle confirmation
  const handleConfirmDelete = () => {
    // Add loading state to button
    confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    confirmDeleteBtn.disabled = true;
    
    // Simulate deletion delay for better UX
    setTimeout(() => {
      users = users.filter(u => u.id !== userId);
      filteredUsers = [...users];
      
      renderUsers();
      updateStats();
      
      // Hide modal with proper class removal
      deleteModal.classList.remove('show');
      
      // Reset button
      confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete User';
      confirmDeleteBtn.disabled = false;
      
      showNotification(`${user.firstName} ${user.lastName} has been deleted successfully!`, 'success');
    }, 1000);
  };
  
  // Add event listener for this specific deletion
  confirmDeleteBtn.onclick = handleConfirmDelete;
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${getNotificationIcon(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add styles
  Object.assign(notification.style, {
    position: 'fixed',
    top: '100px',
    right: '20px',
    background: type === 'success' ? 'var(--success-gradient)' : 
                type === 'error' ? 'var(--danger-gradient)' : 
                'var(--primary-gradient)',
    color: 'white',
    padding: '1rem 1.5rem',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-medium)',
    zIndex: '1001',
    transform: 'translateX(100%)',
    transition: 'var(--transition-smooth)',
    backdropFilter: 'blur(20px)'
  });
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
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

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  .fade-in-row {
    animation: fadeInRow 0.5s ease-out both;
  }
  
  @keyframes fadeInRow {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .loading {
    opacity: 0.7;
    pointer-events: none;
  }
`;
document.head.appendChild(style);
