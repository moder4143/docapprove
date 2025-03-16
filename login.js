
// Supabase configuration
const SUPABASE_URL = 'https://yrlnpfmhegohrdxvsmys.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybG5wZm1oZWdvaHJkeHZzbXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMDc5NzEsImV4cCI6MjA1NzY4Mzk3MX0.jBqODFT7gYuOzl_cWGuHlEvgBtcm6rrlz8M_8oxBm4Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('docApprovalUser'));
  if (user) {
    // Redirect to appropriate page based on role
    if (user.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
  }

  // Add login functionality
  document.getElementById('login-btn').addEventListener('click', login);
  
  // Enable login with Enter key
  document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      login();
    }
  });
});

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('login-message');
  
  if (!username || !password) {
    messageEl.textContent = 'Please enter both username and password';
    messageEl.className = 'message error';
    return;
  }
  
  try {
    // Query the database for the user
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();
      
    if (error) throw error;
    
    if (data) {
      // Store user info in localStorage
      localStorage.setItem('docApprovalUser', JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role
      }));
      
      // Redirect based on role
      if (data.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'index.html';
      }
    } else {
      messageEl.textContent = 'Invalid username or password';
      messageEl.className = 'message error';
    }
  } catch (error) {
    console.error('Login error:', error);
    messageEl.textContent = 'Login failed. Please try again.';
    messageEl.className = 'message error';
  }
}
