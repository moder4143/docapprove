// Supabase configuration
const SUPABASE_URL = 'https://yrlnpfmhegohrdxvsmys.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybG5wZm1oZWdvaHJkeHZzbXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMDc5NzEsImV4cCI6MjA1NzY4Mzk3MX0.jBqODFT7gYuOzl_cWGuHlEvgBtcm6rrlz8M_8oxBm4Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cloudinary configuration
const CLOUD_NAME = "dric9zct5";
const UPLOAD_PRESET = "docapprove";

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

  // Setup file input behavior
  const fileInput = document.getElementById('document-file');
  const fileLabel = document.querySelector('.file-label');
  const fileContainer = document.querySelector('.file-input-container');
  
  // Prevent the file input container from triggering file selection
  if (fileContainer) {
    fileContainer.addEventListener('click', function(e) {
      e.stopPropagation(); // This stops the event from bubbling up
    });
  }
  
  fileInput.addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'No file selected';
    document.getElementById('file-name').textContent = fileName;
  });

  // Make sure clicking on label opens file dialog
  if (fileLabel) {
    fileLabel.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
      fileInput.click();
    });
  }

  // Load recent uploads by this user
  loadRecentUploads(user.id);
  
  // Upload form submission
  document.getElementById('upload-btn').addEventListener('click', function() {
    uploadDocument(user.id);
  });
});

// Load the user's most recent uploads
async function loadRecentUploads(userId) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(5);
      
    if (error) throw error;
    
    const tableBody = document.querySelector('#recent-documents tbody');
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4">No documents uploaded yet</td>';
      tableBody.appendChild(row);
      return;
    }
    
    data.forEach(doc => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${doc.title}</td>
        <td>${doc.description || '-'}</td>
        <td>${new Date(doc.uploaded_at).toLocaleString()}</td>
        <td>${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading documents:', error);
  }
}

// Handle the document upload process
async function uploadDocument(userId) {
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const fileInput = document.getElementById('document-file');
  const messageEl = document.getElementById('upload-message');
  
  // Validate inputs
  if (!title) {
    messageEl.textContent = 'Please enter a title';
    messageEl.className = 'message error';
    return;
  }
  
  if (!fileInput.files[0]) {
    messageEl.textContent = 'Please select a file to upload';
    messageEl.className = 'message error';
    return;
  }
  
  messageEl.textContent = 'Uploading document...';
  messageEl.className = 'message';
  
  try {
    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'document_approval');
    
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const cloudinaryData = await cloudinaryResponse.json();
    
    if (!cloudinaryData.secure_url) {
      throw new Error('File upload failed');
    }
    
    // Save document metadata to Supabase
    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          title,
          description,
          file_url: cloudinaryData.secure_url,
          status: 'pending',
          user_id: userId
        }
      ]);
      
    if (error) throw error;
    
    // Success message and reset form
    messageEl.textContent = 'Document uploaded successfully!';
    messageEl.className = 'message success';
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('document-file').value = '';
    document.getElementById('file-name').textContent = '';
    
    // Reload recent uploads
    loadRecentUploads(userId);
    
  } catch (error) {
    console.error('Upload error:', error);
    messageEl.textContent = 'Upload failed. Please try again.';
    messageEl.className = 'message error';
  }
}
