// Supabase configuration
const SUPABASE_URL = 'https://yrlnpfmhegohrdxvsmys.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybG5wZm1oZWdvaHJkeHZzbXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMDc5NzEsImV4cCI6MjA1NzY4Mzk3MX0.jBqODFT7gYuOzl_cWGuHlEvgBtcm6rrlz8M_8oxBm4Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables for modal
let currentDocumentId = null;
let currentAction = null;

// Check authentication
document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('docApprovalUser'));
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  // Check if user is admin
  if (user.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  // Setup logout button
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('docApprovalUser');
    window.location.href = 'login.html';
  });

  // Setup tabs
  setupTabs();
  
  // Setup navigation between documents and users sections
  document.getElementById('documents-link').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('documents-section').style.display = 'block';
    document.getElementById('users-section').style.display = 'none';
  });
  
  document.getElementById('users-link').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('documents-section').style.display = 'none';
    document.getElementById('users-section').style.display = 'block';
    loadUsers();
  });
  
  // Setup modal events
  document.getElementById('cancel-action').addEventListener('click', hideModal);
  document.getElementById('confirm-action').addEventListener('click', function() {
    const feedback = document.getElementById('feedback').value;
    
    if (currentAction === 'approve') {
      approveDocument(currentDocumentId, feedback);
    } else if (currentAction === 'reject') {
      rejectDocument(currentDocumentId, feedback);
    }
    
    hideModal();
  });
  
  // Setup add user button
  document.getElementById('add-user-btn').addEventListener('click', addUser);
  
  // Load documents by status
  loadDocuments('pending');
  
  // Setup real-time updates
  setupRealtimeUpdates();
});

// Setup tabs for document categories
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      this.classList.add('active');
      
      // Hide all tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Show the corresponding tab content
      const tabName = this.getAttribute('data-tab');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      // Load documents for this tab
      loadDocuments(tabName);
    });
  });
}

// Load documents based on status
async function loadDocuments(status) {
  try {
    // First get users to display usernames
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username');
      
    if (userError) throw userError;
    
    // Create a map of user IDs to usernames
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user.username;
    });
    
    // Get documents with the specified status
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('status', status)
      .order('uploaded_at', { ascending: false });
      
    if (error) throw error;
    
    const tableId = `${status}-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="${status === 'pending' ? 6 : 7}">No ${status} documents found</td>`;
      tableBody.appendChild(row);
      return;
    }
    
    data.forEach(doc => {
      const username = userMap[doc.user_id] || 'Unknown User';
      
      if (status === 'pending') {
        addPendingDocumentRow(doc, username, tableBody);
      } else if (status === 'approved') {
        addApprovedDocumentRow(doc, username, tableBody);
      } else if (status === 'rejected') {
        addRejectedDocumentRow(doc, username, tableBody);
      }
    });
  } catch (error) {
    console.error(`Error loading ${status} documents:`, error);
  }
}

// Add a pending document row
function addPendingDocumentRow(doc, username, tableBody) {
  const row = document.createElement('tr');
  
  row.innerHTML = `
    <td>${doc.title}</td>
    <td>${doc.description || '-'}</td>
    <td>${username}</td>
    <td>${new Date(doc.uploaded_at).toLocaleString()}</td>
    <td><a href="${doc.file_url}" target="_blank">View Document</a></td>
    <td>
      <button class="btn approve-btn" data-id="${doc.id}">Approve</button>
      <button class="btn reject-btn" data-id="${doc.id}">Reject</button>
    </td>
  `;
  
  tableBody.appendChild(row);
  
  // Add event listeners for approve/reject buttons
  row.querySelector('.approve-btn').addEventListener('click', function() {
    showModal('approve', doc.id);
  });
  
  row.querySelector('.reject-btn').addEventListener('click', function() {
    showModal('reject', doc.id);
  });
}

// Add an approved document row
function addApprovedDocumentRow(doc, username, tableBody) {
  const row = document.createElement('tr');
  
  row.innerHTML = `
    <td>${doc.title}</td>
    <td>${doc.description || '-'}</td>
    <td>${username}</td>
    <td>${new Date(doc.uploaded_at).toLocaleString()}</td>
    <td><a href="${doc.file_url}" target="_blank">View Document</a></td>
    <td>${new Date(doc.updated_at).toLocaleString()}</td>
    <td>${doc.feedback || '-'}</td>
  `;
  
  tableBody.appendChild(row);
}

// Add a rejected document row
function addRejectedDocumentRow(doc, username, tableBody) {
  const row = document.createElement('tr');
  
  row.innerHTML = `
    <td>${doc.title}</td>
    <td>${doc.description || '-'}</td>
    <td>${username}</td>
    <td>${new Date(doc.uploaded_at).toLocaleString()}</td>
    <td><a href="${doc.file_url}" target="_blank">View Document</a></td>
    <td>${new Date(doc.updated_at).toLocaleString()}</td>
    <td>${doc.feedback || '-'}</td>
  `;
  
  tableBody.appendChild(row);
}

// Show the feedback modal
function showModal(action, documentId) {
  currentDocumentId = documentId;
  currentAction = action;
  
  const modalTitle = document.getElementById('modal-title');
  const confirmBtn = document.getElementById('confirm-action');
  
  if (action === 'approve') {
    modalTitle.textContent = 'Approve Document';
    confirmBtn.textContent = 'Approve';
    confirmBtn.className = 'btn approve-btn';
  } else {
    modalTitle.textContent = 'Reject Document';
    confirmBtn.textContent = 'Reject';
    confirmBtn.className = 'btn reject-btn';
  }
  
  document.getElementById('feedback').value = '';
  document.getElementById('feedback-modal').style.display = 'block';
}

// Hide the feedback modal
function hideModal() {
  document.getElementById('feedback-modal').style.display = 'none';
  currentDocumentId = null;
  currentAction = null;
}

// Approve a document
async function approveDocument(documentId, feedback) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update({
        status: 'approved',
        feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
      
    if (error) throw error;
    
    // Document will be reloaded via realtime subscription
  } catch (error) {
    console.error('Error approving document:', error);
  }
}

// Reject a document
async function rejectDocument(documentId, feedback) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update({
        status: 'rejected',
        feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
      
    if (error) throw error;
    
    // Document will be reloaded via realtime subscription
  } catch (error) {
    console.error('Error rejecting document:', error);
  }
}

// Load users for the user management section
async function loadUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const tableBody = document.querySelector('#users-table tbody');
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4">No users found</td>';
      tableBody.appendChild(row);
      return;
    }
    
    data.forEach(user => {
      addUserRow(user, tableBody);
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Add a user row to the users table
function addUserRow(user, tableBody) {
  const row = document.createElement('tr');
  
  row.innerHTML = `
    <td>${user.username}</td>
    <td>${user.role}</td>
    <td>${new Date(user.created_at).toLocaleString()}</td>
    <td>
      <button class="btn reject-btn" data-id="${user.id}">Delete</button>
    </td>
  `;
  
  tableBody.appendChild(row);
  
  // Add event listener for delete button
  row.querySelector('.reject-btn').addEventListener('click', function() {
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
      deleteUser(user.id);
    }
  });
}

// Add a new user
async function addUser() {
  const username = document.getElementById('new-username').value;
  const password = document.getElementById('new-password').value;
  const role = document.getElementById('user-role').value;
  const messageEl = document.getElementById('user-message');
  
  if (!username || !password) {
    messageEl.textContent = 'Please enter both username and password';
    messageEl.className = 'message error';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          password,
          role
        }
      ]);
      
    if (error) {
      if (error.code === '23505') {
        messageEl.textContent = 'Username already exists';
        messageEl.className = 'message error';
      } else {
        throw error;
      }
      return;
    }
    
    messageEl.textContent = 'User added successfully';
    messageEl.className = 'message success';
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    
    // Reload users
    loadUsers();
    
  } catch (error) {
    console.error('Error adding user:', error);
    messageEl.textContent = 'Error adding user';
    messageEl.className = 'message error';
  }
}

// Delete a user
async function deleteUser(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
      
    if (error) throw error;
    
    // Reload users
    loadUsers();
    
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

// Set up realtime updates
function setupRealtimeUpdates() {
  const subscription = supabase
    .channel('table-db-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'documents'
    }, payload => {
      // Get the active tab
      const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
      
      // Reload documents for the active tab
      loadDocuments(activeTab);
    })
    .subscribe();
    
  const usersSubscription = supabase
    .channel('users-db-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'users'
    }, payload => {
      // Check if users section is visible
      if (document.getElementById('users-section').style.display !== 'none') {
        loadUsers();
      }
    })
    .subscribe();
}
