// Common functionality for both pages
document.addEventListener("DOMContentLoaded", function() {
  // Back to Top Button functionality
  const backToTopBtn = document.getElementById("backToTop");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
    });
    
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  
  // Scroll Animations
  const sections = document.querySelectorAll(".animate-on-scroll");
  if (sections.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: 0.1 });
    
    sections.forEach(section => observer.observe(section));
  }
  
  // Initialize page-specific functionality
  initPageSpecificFunctionality();
});

function initPageSpecificFunctionality() {
  // Check which page we're on and initialize the appropriate functionality
  if (document.getElementById("demo-chat")) {
    initHomePage();
  } else if (document.getElementById("servicesGrid")) {
    initDeveloperPage();
  }
}

function initHomePage() {
  // Extension ID 
  const EXTENSION_ID = "edkgcdpbaggofodchjfkfiblhohmkbac";
  let openAIKey = "";

  // Add welcome message to chat
  appendChatMessage("assistant", "Hello! I'm an AI assistant powered by your OpenAI API key. Connect your key and ask me anything!");

  // Event Listeners for Chat Interface
  const connectKeyBtn = document.getElementById("connectKeyBtn");
  const sendChatBtn = document.getElementById("sendChatBtn");
  const chatInput = document.getElementById("chatInput");
  
  if (connectKeyBtn) {
    connectKeyBtn.addEventListener("click", retrieveAPIKeyFromExtension);
  }
  
  if (sendChatBtn) {
    sendChatBtn.addEventListener("click", () => {
      const input = document.getElementById("chatInput");
      const message = input.value.trim();
      if (message) {
        input.value = "";
        callOpenAI(message);
      }
    });
  }
  
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatBtn.click();
      }
    });
  }

  // Append chat message
  function appendChatMessage(role, text) {
    const container = document.getElementById("chatContainer");
    if (!container) return;
    
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${role}`;
    msgDiv.textContent = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  // Advanced key retrieval function that tries multiple approaches
  function retrieveAPIKeyFromExtension() {
    if (typeof chrome === "undefined" || !chrome.runtime || typeof chrome.runtime.sendMessage !== "function") {
      document.getElementById("chatStatus").innerHTML = `
        <span style="color: #dc3545;">⚠️ This demo requires Chrome with HTTPS or localhost</span>
      `;
      return;
    }
    
    // Show initial connecting message
    document.getElementById("chatStatus").innerHTML = `
      <span style="color: #6c757d;">⏳ Connecting to extension...</span>
    `;
    document.getElementById("connectKeyBtn").disabled = true;
    
    // First check if extension is available with a ping
    chrome.runtime.sendMessage(EXTENSION_ID, { type: "ping" }, function(pingResponse) {
      if (!pingResponse || chrome.runtime.lastError) {
        // Extension not found or error communicating
        document.getElementById("chatStatus").innerHTML = `
          <span style="color: #dc3545;">❌ Extension not detected</span>
          <br><small>Please install the <a href="https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac" target="_blank">APIKEY Connect extension</a> first</small>
        `;
        document.getElementById("connectKeyBtn").disabled = false;
        return;
      }
      
      // Try retrieving without a key name first (default key)
      chrome.runtime.sendMessage(EXTENSION_ID, {
        type: "requestKey",
        serviceId: "openai"
      }, function(response) {
        if (response && response.success) {
          // Success with default key
          handleSuccessfulConnection(response.key);
        } else {
          // Try with common key names
          tryNextKeyName(0);
        }
      });
    });
    
    // Array of common key names to try
    const commonKeyNames = [
      "OpenAI API", 
      "OpenAI",
      "Default OpenAI Key",
      "OpenAI Key",
      "Default Key",
      "Personal API Key"
    ];
    
    // Try each key name in sequence
    function tryNextKeyName(index) {
      if (index >= commonKeyNames.length) {
        // We've tried all options, show comprehensive error
        document.getElementById("chatStatus").innerHTML = `
          <span style="color: #dc3545;">❌ No OpenAI key found</span>
          <br><small>Please add an OpenAI key in your APIKEY Connect extension.</small>
          <br><small>1. Click the extension icon</small>
          <br><small>2. Select "OpenAI API" from the dropdown</small>
          <br><small>3. Enter your API key</small>
          <br><small>4. Click "Add Key"</small>
        `;
        document.getElementById("connectKeyBtn").disabled = false;
        return;
      }
      
      // Try with the next key name
      document.getElementById("chatStatus").innerHTML = `
        <span style="color: #6c757d;">⏳ Trying to find your key... (${index + 1}/${commonKeyNames.length})</span>
      `;
      
      chrome.runtime.sendMessage(EXTENSION_ID, {
        type: "requestKey",
        serviceId: "openai",
        keyName: commonKeyNames[index]
      }, function(response) {
        if (response && response.success) {
          // Success with this key name
          handleSuccessfulConnection(response.key);
        } else {
          // Try next key name
          setTimeout(() => tryNextKeyName(index + 1), 300);
        }
      });
    }
    
    // Handle successful connection
    function handleSuccessfulConnection(key) {
      openAIKey = key;
      document.getElementById("chatStatus").innerHTML = `
        <span style="color: #28a745;">✅ API Key connected successfully!</span>
      `;
      document.getElementById("connectKeyBtn").textContent = "Key Connected";
      document.getElementById("connectKeyBtn").style.backgroundColor = "#6c757d";
      document.getElementById("connectKeyBtn").disabled = false;
      setTimeout(() => {
        document.getElementById("chatInput").focus();
      }, 500);
    }
  }

  // Call OpenAI API
  async function callOpenAI(userMessage) {
    if (!openAIKey) {
      document.getElementById("chatStatus").innerHTML = "<span style='color: #dc3545;'>❌ Please connect your API key first.</span>";
      return;
    }
    appendChatMessage("user", userMessage);
    const sendBtn = document.getElementById("sendChatBtn");
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.7
    };
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
      const data = await response.json();
      const reply = data.choices[0].message.content.trim();
      appendChatMessage("assistant", reply);
    } catch (error) {
      document.getElementById("chatStatus").innerHTML = `<span style='color: #dc3545;'>❌ Error: ${error.message}</span>`;
      
      // More helpful error message for common issues
      if (error.message.includes("401")) {
        document.getElementById("chatStatus").innerHTML += "<br><small>Your API key might be invalid. Check it in the extension.</small>";
      } else if (error.message.includes("429")) {
        document.getElementById("chatStatus").innerHTML += "<br><small>Rate limit exceeded. Your API key may have reached its quota.</small>";
      }
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  }
}

function initDeveloperPage() {
  // Service data
  const services = [
    { id: 'openai', name: 'OpenAI', icon: '🤖', keyFormat: 'sk-xxxx...', serviceId: 'openai', keyName: 'Default OpenAI Key', buttonText: 'Use My OpenAI API Key' },
    { id: 'stripe', name: 'Stripe', icon: '💳', keyFormat: 'sk_test_xxxx...', serviceId: 'stripe', keyName: 'My Stripe Key', buttonText: 'Use My Stripe API Key' },
    { id: 'aws', name: 'AWS', icon: '☁️', keyFormat: 'AKIA...', serviceId: 'aws', keyName: 'My AWS Key', buttonText: 'Use My AWS API Key' },
    { id: 'google_maps', name: 'Google Maps', icon: '🗺️', keyFormat: 'AIza...', serviceId: 'google_maps', keyName: 'My Google Maps Key', buttonText: 'Use My Google Maps API Key' },
    { id: 'twilio', name: 'Twilio', icon: '📱', keyFormat: 'SK...', serviceId: 'twilio', keyName: 'My Twilio Key', buttonText: 'Use My Twilio API Key' },
    { id: 'github', name: 'GitHub', icon: '📦', keyFormat: 'ghp_...', serviceId: 'github', keyName: 'My GitHub Token', buttonText: 'Use My GitHub Token' },
    { id: 'twitter_x', name: 'Twitter/X', icon: '🐦', keyFormat: 'AAAA...', serviceId: 'twitter_x', keyName: 'My Twitter API Key', buttonText: 'Use My Twitter API Key' },
    { id: 'coinbase', name: 'Coinbase', icon: '₿', keyFormat: 'xxxx-xxxx...', serviceId: 'coinbase', keyName: 'My Coinbase API Key', buttonText: 'Use My Coinbase API Key' },
    { id: 'azure', name: 'Azure', icon: '☁️', keyFormat: 'ApiKey...', serviceId: 'azure', keyName: 'My Azure API Key', buttonText: 'Use My Azure API Key' },
    { id: 'anthropic', name: 'Anthropic', icon: '🧠', keyFormat: 'sk-ant-...', serviceId: 'anthropic', keyName: 'My Claude API Key', buttonText: 'Use My Claude API Key' },
    { id: 'cohere', name: 'Cohere', icon: '💬', keyFormat: 'Co...', serviceId: 'cohere', keyName: 'My Cohere API Key', buttonText: 'Use My Cohere API Key' },
    { id: 'cloudflare', name: 'Cloudflare', icon: '☁️', keyFormat: 'xxxx...', serviceId: 'cloudflare', keyName: 'My Cloudflare API Key', buttonText: 'Use My Cloudflare API Key' }
  ];

  // Extension ID
  const EXTENSION_ID = "edkgcdpbaggofodchjfkfiblhohmkbac";
  
  // Check if the extension is installed
  checkExtensionInstalled();
  
  // Initialize service cards
  const servicesGrid = document.getElementById('servicesGrid');
  if (servicesGrid) {
    services.forEach(service => {
      const card = document.createElement('div');
      card.className = 'service-card';
      card.dataset.serviceId = service.id;
      
      if (service.id === 'openai') {
        card.classList.add('active');
      }
      
      card.innerHTML = `
        <div class="service-icon">${service.icon}</div>
        <div class="service-name">${service.name}</div>
      `;
      
      card.addEventListener('click', () => {
        selectService(service);
      });
      
      servicesGrid.appendChild(card);
    });
  }

  // Function to check if extension is installed
  async function checkExtensionInstalled() {
    const statusEl = document.getElementById('extensionStatus');
    if (!statusEl) return;
    
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('span');
    const installPrompt = statusEl.querySelector('.install-prompt');
    
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Extension not available (browser not compatible)';
        installPrompt.style.display = 'block';
        return false;
      }
      
      const response = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 2000);
        
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
          clearTimeout(timeout);
          
          // Check for error
          const error = chrome.runtime.lastError;
          if (error) {
            resolve(null);
            return;
          }
          
          resolve(response);
        });
      });
      
      if (response && response.success) {
        statusDot.className = 'status-dot success';
        statusText.textContent = 'APIKEY Connect extension is installed';
        installPrompt.style.display = 'none';
        return true;
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'APIKEY Connect extension is not installed';
        installPrompt.style.display = 'block';
        return false;
      }
    } catch (error) {
      console.error('Error checking extension:', error);
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Error checking extension status';
      installPrompt.style.display = 'block';
      return false;
    }
  }

  // Service selection function
  function selectService(service) {
    // Update active state
    document.querySelectorAll('.service-card').forEach(card => {
      card.classList.remove('active');
    });
    document.querySelector(`.service-card[data-service-id="${service.id}"]`).classList.add('active');
    
    // Update title
    document.getElementById('selectedServiceTitle').textContent = `${service.name} Integration`;
    
    // Update form values
    document.getElementById('serviceId').value = service.serviceId;
    document.getElementById('keyName').value = service.keyName;
    document.getElementById('buttonText').value = service.buttonText;
    
    // Update preview button
    const previewButton = document.getElementById('previewButton');
    if (previewButton) {
      previewButton.textContent = service.buttonText;
      
      // Remove any previous classes except apikey-connect-btn
      previewButton.className = 'apikey-connect-btn';
    }
    
    // Update code snippets
    updateCodeSnippets();
  }

  // Service search functionality
  const searchInput = document.getElementById('servicesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      
      document.querySelectorAll('.service-card').forEach(card => {
        const serviceName = card.querySelector('.service-name').textContent.toLowerCase();
        if (serviceName.includes(query)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Code tabs functionality
  const outputTabs = document.querySelectorAll('.output-tab');
  outputTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      
      // Update active tab
      document.querySelectorAll('.output-tab').forEach(t => {
        t.classList.remove('active');
      });
      tab.classList.add('active');
      
      // Show active content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabName}Tab`).classList.add('active');
    });
  });

  // Copy button functionality
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const codeElement = document.getElementById(targetId);
      
      navigator.clipboard.writeText(codeElement.textContent)
        .then(() => {
          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
            Copied!
          `;
          
          setTimeout(() => {
            btn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            `;
          }, 2000);
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
        });
    });
  });

  // Form input change listeners
  const configInputs = document.querySelectorAll('#serviceId, #keyName, #buttonText, #framework');
  configInputs.forEach(input => {
    input.addEventListener('input', updateCodeSnippets);
  });

  // Preview button functionality
  const previewButton = document.getElementById('previewButton');
  if (previewButton) {
    previewButton.addEventListener('click', async function() {
      const serviceId = document.getElementById('serviceId').value;
      const keyName = document.getElementById('keyName').value;
      const previewResult = document.getElementById('previewResult');
      
      // Add loading state
      this.disabled = true;
      this.classList.add('loading');
      const originalText = this.textContent;
      this.textContent = 'Requesting...';
      
      try {
        // First check if extension is installed
        const isInstalled = await checkExtensionInstalled();
        
        if (!isInstalled) {
          throw new Error('APIKEY Connect extension is not installed');
        }
        
        // Request the API key from the extension
        const response = await chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            type: "requestKey",
            serviceId: serviceId,
            keyName: keyName
          }
        );
        
        if (response && response.success) {
          // Success
          this.classList.remove('loading');
          this.classList.add('success');
          this.textContent = 'Key Received!';
          
          if (previewResult) {
            previewResult.style.display = 'block';
            previewResult.innerHTML = `
              <div style="padding: 12px; background-color: #d1fae5; border-radius: 6px; color: #065f46; font-size: 14px;">
                <strong>Success!</strong> API key received (${response.key.substring(0, 3)}...)
              </div>
            `;
          }
          
          // Reset after 2 seconds
          setTimeout(() => {
            this.classList.remove('success');
            this.disabled = false;
            this.textContent = originalText;
          }, 2000);
        } else {
          // Error
          throw new Error(response?.error || 'Failed to get API key');
        }
      } catch (error) {
        // Handle error
        console.error('Preview button error:', error);
        
        this.classList.remove('loading');
        this.classList.add('error');
        this.textContent = 'Error!';
        
        if (previewResult) {
          previewResult.style.display = 'block';
          previewResult.innerHTML = `
            <div style="padding: 12px; background-color: #fee2e2; border-radius: 6px; color: #b91c1c; font-size: 14px;">
              <strong>Error:</strong> ${error.message || 'Unknown error occurred'}
            </div>
          `;
        }
        
        // Reset after 2 seconds
        setTimeout(() => {
          this.classList.remove('error');
          this.disabled = false;
          this.textContent = originalText;
        }, 2000);
      }
    });
  }

  // Update code snippets function
  function updateCodeSnippets() {
    const serviceId = document.getElementById('serviceId').value;
    const keyName = document.getElementById('keyName').value;
    const buttonText = document.getElementById('buttonText').value;
    const framework = document.getElementById('framework').value;
    
    // Update HTML code
    const htmlCode = document.getElementById('htmlCode');
    htmlCode.innerHTML = `<span class="comment">&lt;!-- Add this button to your HTML --&gt;</span>
&lt;<span class="key">button</span> <span class="key">id</span>=<span class="value">"apiKeyProtectBtn"</span> <span class="key">class</span>=<span class="value">"apikey-connect-btn"</span>&gt;
  ${buttonText}
&lt;/<span class="key">button</span>&gt;

<span class="comment">&lt;!-- Add this div to display errors (optional) --&gt;</span>
&lt;<span class="key">div</span> <span class="key">id</span>=<span class="value">"apiKeyError"</span> <span class="key">class</span>=<span class="value">"error-message"</span> <span class="key">style</span>=<span class="value">"display: none;"</span>&gt;&lt;/<span class="key">div</span>&gt;`;
    
    // Update JS code
    const jsCode = document.getElementById('jsCode');
    jsCode.innerHTML = `<span class="comment">// Add this JavaScript to your page</span>
document.addEventListener('DOMContentLoaded', function() {
  const apiKeyProtectBtn = document.getElementById('apiKeyProtectBtn');
  const apiKeyError = document.getElementById('apiKeyError');
  
  <span class="comment">// Extension ID for APIKEY Connect</span>
  const EXTENSION_ID = 'edkgcdpbaggofodchjfkfiblhohmkbac';
  
  <span class="comment">// Function to show error messages</span>
  function showError(message) {
    if (apiKeyError) {
      apiKeyError.textContent = message;
      apiKeyError.style.display = 'block';
      setTimeout(() => {
        apiKeyError.style.display = 'none';
      }, 5000);
    } else {
      alert(message);
    }
  }
  
  <span class="comment">// Function to check if extension is installed</span>
  async function checkExtension() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        return false;
      }
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
          <span class="comment">// Check for error</span>
          const error = chrome.runtime.lastError;
          if (error) {
            resolve(false);
            return;
          }
          
          resolve(response && response.success);
        });
      });
    } catch (error) {
      return false;
    }
  }
  
  <span class="comment">// Button click handler</span>
  apiKeyProtectBtn.addEventListener('click', async function() {
    try {
      <span class="comment">// Disable button during the request</span>
      apiKeyProtectBtn.disabled = true;
      
      <span class="comment">// Check if the extension is installed</span>
      const isInstalled = await checkExtension();
      if (!isInstalled) {
        if (confirm('The APIKEY Connect extension is required but not installed. Would you like to install it now?')) {
          window.open('https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac', '_blank');
        }
        apiKeyProtectBtn.disabled = false;
        return;
      }
      
      <span class="comment">// Request the API key from the extension</span>
      const response = await chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: "requestKey",
          serviceId: "${serviceId}",      <span class="comment">// Specify the service ID</span>
          keyName: "${keyName}"  <span class="comment">// Specify the key name</span>
        }
      );
      
      if (response && response.success) {
        <span class="comment">// Success! You now have the API key</span>
        const apiKey = response.key;
        
        <span class="comment">// Use the API key to make requests</span>
        console.log('API Key received:', apiKey.substring(0, 3) + '...');
        
        <span class="comment">// Your code to use the API key goes here</span>
        useApiKey(apiKey);
      } else {
        <span class="comment">// Handle error or rejection</span>
        showError(response?.error || 'Failed to get API key');
      }
    } catch (error) {
      console.error('Error requesting API key:', error);
      showError('Error requesting API key. Is the extension installed?');
    } finally {
      <span class="comment">// Re-enable button</span>
      apiKeyProtectBtn.disabled = false;
    }
  });
  
  <span class="comment">// Example function to use the API key</span>
  function useApiKey(apiKey) {
    <span class="comment">// Example function to use the API key for requests</span>
    <span class="comment">// Replace this with your actual API calls</span>
    fetch('https://api.${serviceId}.com/v1/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      },
      body: JSON.stringify({
        <span class="comment">// Your request payload</span>
      })
    })
    .then(response => response.json())
    .then(data => console.log('API response:', data))
    .catch(error => console.error('API request failed:', error));
  }
});`;
    
    // Update CSS code
    const cssCode = document.getElementById('cssCode');
    cssCode.innerHTML = `<span class="comment">/* Add this CSS to your stylesheet */</span>
.apikey-connect-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.apikey-connect-btn::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 11.5C9 12.8807 7.88071 14 6.5 14C5.11929 14 4 12.8807 4 11.5C4 10.1193 5.11929 9 6.5 9C7.88071 9 9 10.1193 9 11.5Z'%3E%3C/path%3E%3Cpath d='M9 11.5H20V14H17V17H14V14H9'%3E%3C/path%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
}

.apikey-connect-btn:hover {
  background-color: #4338ca;
}

.apikey-connect-btn:active {
  transform: scale(0.98);
}

.apikey-connect-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  margin-top: 0.5rem;
  padding: 0.5rem;
  color: #b91c1c;
  background-color: #fee2e2;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
}`;
    
    // Update full code
    const fullCode = document.getElementById('fullCode');
    fullCode.innerHTML = `<span class="comment">&lt;!-- Complete Integration Example --&gt;</span>
&lt;<span class="key">html</span>&gt;
&lt;<span class="key">head</span>&gt;
  &lt;<span class="key">title</span>&gt;APIKEY Connect Integration Example&lt;/<span class="key">title</span>&gt;
  &lt;<span class="key">style</span>&gt;
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    
    .apikey-connect-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background-color: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
      margin: 20px 0;
    }
    
    .apikey-connect-btn::before {
      content: '';
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 11.5C9 12.8807 7.88071 14 6.5 14C5.11929 14 4 12.8807 4 11.5C4 10.1193 5.11929 9 6.5 9C7.88071 9 9 10.1193 9 11.5Z'%3E%3C/path%3E%3Cpath d='M9 11.5H20V14H17V17H14V14H9'%3E%3C/path%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    
    .apikey-connect-btn:hover {
      background-color: #4338ca;
    }
    
    .apikey-connect-btn:active {
      transform: scale(0.98);
    }
    
    .apikey-connect-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .error-message {
      margin-top: 0.5rem;
      padding: 0.5rem;
      color: #b91c1c;
      background-color: #fee2e2;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .result-container {
      margin-top: 20px;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .result-container.success {
      border: 1px solid #d1fae5;
    }
    
    .result-container.error {
      border: 1px solid #fee2e2;
    }
    
    .result-header {
      padding: 10px 15px;
      font-weight: 600;
    }
    
    .result-container.success .result-header {
      background-color: #d1fae5;
      color: #065f46;
    }
    
    .result-container.error .result-header {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .result-body {
      padding: 15px;
      background-color: #f9fafb;
    }
    
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: monospace;
    }
    
    .extension-status {
      padding: 15px;
      border-radius: 8px;
      background-color: #f3f4f6;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      font-size: 14px;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    .status-dot.pending { background-color: #f59e0b; }
    .status-dot.success { background-color: #10b981; }
    .status-dot.error { background-color: #ef4444; }
    
    .install-link {
      margin-left: auto;
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    
    .install-link:hover {
      text-decoration: underline;
    }
  &lt;/<span class="key">style</span>&gt;
&lt;/<span class="key">head</span>&gt;
&lt;<span class="key">body</span>&gt;
  &lt;<span class="key">h1</span>&gt;APIKEY Connect Integration Example&lt;/<span class="key">h1</span>&gt;
  
  &lt;<span class="key">div</span> <span class="key">id</span>=<span class="value">"extensionStatus"</span> <span class="key">class</span>=<span class="value">"extension-status"</span>&gt;
    &lt;<span class="key">div</span> <span class="key">class</span>=<span class="value">"status-dot pending"</span>&gt;&lt;/<span class="key">div</span>&gt;
    &lt;<span class="key">span</span>&gt;Checking extension status...&lt;/<span class="key">span</span>&gt;
    &lt;<span class="key">a</span> <span class="key">href</span>=<span class="value">"https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac"</span> <span class="key">class</span>=<span class="value">"install-link"</span> <span class="key">target</span>=<span class="value">"_blank"</span> <span class="key">style</span>=<span class="value">"display: none;"</span>&gt;Install Extension&lt;/<span class="key">a</span>&gt;
  &lt;/<span class="key">div</span>&gt;
  
  &lt;<span class="key">p</span>&gt;
    This example demonstrates how to securely access your ${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)} API key through the APIKEY Connect extension.
    Click the button below to request your API key:
  &lt;/<span class="key">p</span>&gt;
  
  &lt;<span class="key">button</span> <span class="key">id</span>=<span class="value">"apiKeyProtectBtn"</span> <span class="key">class</span>=<span class="value">"apikey-connect-btn"</span>&gt;
    ${buttonText}
  &lt;/<span class="key">button</span>&gt;
  
  &lt;<span class="key">div</span> <span class="key">id</span>=<span class="value">"apiKeyError"</span> <span class="key">class</span>=<span class="value">"error-message"</span> <span class="key">style</span>=<span class="value">"display: none;"</span>&gt;&lt;/<span class="key">div</span>&gt;
  
  &lt;<span class="key">div</span> <span class="key">id</span>=<span class="value">"resultContainer"</span> <span class="key">style</span>=<span class="value">"display: none;"</span>&gt;&lt;/<span class="key">div</span>&gt;
  
  &lt;<span class="key">script</span>&gt;
    document.addEventListener('DOMContentLoaded', function() {
      <span class="comment">// Elements</span>
      const apiKeyProtectBtn = document.getElementById('apiKeyProtectBtn');
      const apiKeyError = document.getElementById('apiKeyError');
      const resultContainer = document.getElementById('resultContainer');
      const extensionStatus = document.getElementById('extensionStatus');
      
      <span class="comment">// Constants</span>
      const EXTENSION_ID = 'edkgcdpbaggofodchjfkfiblhohmkbac';
      
      <span class="comment">// Check if extension is installed</span>
      checkExtension();
      
      <span class="comment">// Functions</span>
      function showError(message) {
        if (apiKeyError) {
          apiKeyError.textContent = message;
          apiKeyError.style.display = 'block';
          setTimeout(() => {
            apiKeyError.style.display = 'none';
          }, 5000);
        } else {
          alert(message);
        }
      }
      
      async function checkExtension() {
        try {
          const statusDot = extensionStatus.querySelector('.status-dot');
          const statusText = extensionStatus.querySelector('span');
          const installLink = extensionStatus.querySelector('.install-link');
          
          if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Extension not available (browser not compatible)';
            installLink.style.display = 'inline';
            return false;
          }
          
          const response = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            
            chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
              clearTimeout(timeout);
              
              <span class="comment">// Check for error</span>
              const error = chrome.runtime.lastError;
              if (error) {
                resolve(null);
                return;
              }
              
              resolve(response);
            });
          });
          
          if (response && response.success) {
            statusDot.className = 'status-dot success';
            statusText.textContent = 'APIKEY Connect extension is installed';
            installLink.style.display = 'none';
            return true;
          } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'APIKEY Connect extension is not installed';
            installLink.style.display = 'inline';
            return false;
          }
        } catch (error) {
          console.error('Error checking extension:', error);
          return false;
        }
      }
      
      <span class="comment">// Button click handler</span>
      apiKeyProtectBtn.addEventListener('click', async function() {
        <span class="comment">// Clear previous results</span>
        resultContainer.style.display = 'none';
        apiKeyError.style.display = 'none';
      
        try {
          <span class="comment">// Show loading state</span>
          apiKeyProtectBtn.disabled = true;
          apiKeyProtectBtn.textContent = 'Requesting API Key...';
          
          <span class="comment">// Check if extension is installed</span>
          const isInstalled = await checkExtension();
          if (!isInstalled) {
            if (confirm('The APIKEY Connect extension is required but not installed. Would you like to install it now?')) {
              window.open('https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac', '_blank');
            }
            throw new Error('Extension not installed');
          }
          
          <span class="comment">// Request the API key from the extension</span>
          const response = await chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
              type: "requestKey",
              serviceId: "${serviceId}",
              keyName: "${keyName}"
            }
          );
          
          if (response && response.success) {
            <span class="comment">// Success! You now have the API key</span>
            const apiKey = response.key;
            
            <span class="comment">// Show success state</span>
            resultContainer.innerHTML = \`
              &lt;div class="result-container success"&gt;
                &lt;div class="result-header"&gt;API Key Retrieved Successfully&lt;/div&gt;
                &lt;div class="result-body"&gt;
                  API key successfully retrieved. Key starts with: \${apiKey.substring(0, 3)}...
                &lt;/div&gt;
              &lt;/div&gt;
            \`;
            resultContainer.style.display = 'block';
            
            <span class="comment">// Use the API key for a real API call</span>
            try {
              const apiResponse = await callApiExample(apiKey);
              
              <span class="comment">// Show API response</span>
              resultContainer.innerHTML += \`
                &lt;div class="result-container success" style="margin-top: 15px;"&gt;
                  &lt;div class="result-header"&gt;API Response&lt;/div&gt;
                  &lt;div class="result-body"&gt;
                    &lt;pre&gt;\${JSON.stringify(apiResponse, null, 2)}&lt;/pre&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              \`;
            } catch (apiError) {
              <span class="comment">// Show API error</span>
              resultContainer.innerHTML += \`
                &lt;div class="result-container error" style="margin-top: 15px;"&gt;
                  &lt;div class="result-header"&gt;API Request Failed&lt;/div&gt;
                  &lt;div class="result-body"&gt;
                    \${apiError.message || 'Unknown error'}
                  &lt;/div&gt;
                &lt;/div&gt;
              \`;
            }
          } else {
            <span class="comment">// Handle error or rejection</span>
            throw new Error(response?.error || 'Failed to get API key');
          }
        } catch (error) {
          console.error('Error requesting API key:', error);
          showError(error.message || 'Error requesting API key');
          
          <span class="comment">// Show error in results container</span>
          resultContainer.innerHTML = \`
            &lt;div class="result-container error"&gt;
              &lt;div class="result-header"&gt;Error&lt;/div&gt;
              &lt;div class="result-body"&gt;
                \${error.message || 'Unknown error occurred'}
              &lt;/div&gt;
            &lt;/div&gt;
          \`;
          resultContainer.style.display = 'block';
        } finally {
          <span class="comment">// Reset button state</span>
          apiKeyProtectBtn.disabled = false;
          apiKeyProtectBtn.textContent = '${buttonText}';
        }
      });
      
      <span class="comment">// Example API call function</span>
      async function callApiExample(apiKey) {
        <span class="comment">// This is just an example - replace with the actual API call for your service</span>
        const response = await fetch('https://api.${serviceId}.com/v1/endpoint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${apiKey}\`
          },
          body: JSON.stringify({
            <span class="comment">// Your request payload here</span>
          })
        });
        
        if (!response.ok) {
          throw new Error(\`API request failed: \${response.status} \${response.statusText}\`);
        }
        
        return await response.json();
      }
    });
  &lt;/<span class="key">script</span>&gt;
&lt;/<span class="key">body</span>&gt;
&lt;/<span class="key">html</span>&gt;`;
  }
}
