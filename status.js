// Supabase configuration
const SUPABASE_URL = 'https://yrlnpfmhegohrdxvsmys.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybG5wZm1oZWdvaHJkeHZzbXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMDc5NzEsImV4cCI6MjA1NzY4Mzk3MX0.jBqODFT7gYuOzl_cWGuHlEvgBtcm6rrlz8M_8oxBm4Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Check authentication
document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('docApprovalUser'));
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Setup logout button
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('docApprovalUser');
    window.location.href = 'login.html';
  });

  // Load documents
  loadDocuments(user.id);
  
  // Setup real-time subscription for updates
  setupRealtimeUpdates(user.id);
});

// Load all documents for this user
async function loadDocuments(userId) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
      
    if (error) throw error;
    
    const tableBody = document.querySelector('#status-table tbody');
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="6">No documents found</td>';
      tableBody.appendChild(row);
      return;
    }
    
    data.forEach(doc => {
      addDocumentRow(doc, tableBody);
    });
  } catch (error) {
    console.error('Error loading documents:', error);
  }
}

// Add a document row to the table
function addDocumentRow(doc, tableBody) {
  const row = document.createElement('tr');
  
  // Get status with first letter capitalized
  const status = doc.status.charAt(0).toUpperCase() + doc.status.slice(1);
  
  // Add status-specific class
  let statusClass = '';
  if (doc.status === 'approved') statusClass = 'success';
  else if (doc.status === 'rejected') statusClass = 'error';
  
  row.innerHTML = `
    <td>${doc.title}</td>
    <td>${doc.description || '-'}</td>
    <td><a href="${doc.file_url}" target="_blank">View Document</a></td>
    <td>${new Date(doc.uploaded_at).toLocaleString()}</td>
    <td class="${statusClass}">${status}</td>
    <td>${doc.feedback || '-'}</td>
  `;
  
  tableBody.appendChild(row);
}

// Set up realtime updates when documents change
function setupRealtimeUpdates(userId) {
  const subscription = supabase
    .channel('document-updates')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'documents',
      filter: `user_id=eq.${userId}`
    }, payload => {
      // Reload the full table to ensure consistency
      loadDocuments(userId);
    })
    .subscribe();
}
