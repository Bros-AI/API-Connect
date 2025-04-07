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

  // Append a welcome message to the chat container
  function appendChatMessage(role, text) {
    const container = document.getElementById("chatContainer");
    if (!container) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${role}`;
    msgDiv.textContent = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

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

  // Advanced key retrieval function that tries multiple approaches
  function retrieveAPIKeyFromExtension() {
    if (typeof chrome === "undefined" || !chrome.runtime || typeof chrome.runtime.sendMessage !== "function") {
      document.getElementById("chatStatus").innerHTML = `<span style="color: #dc3545;">⚠️ This demo requires Chrome with HTTPS or localhost</span>`;
      return;
    }
    // Show initial connecting message
    document.getElementById("chatStatus").innerHTML = `<span style="color: #6c757d;">⏳ Connecting to extension...</span>`;
    document.getElementById("connectKeyBtn").disabled = true;
    // Ping the extension
    chrome.runtime.sendMessage(EXTENSION_ID, { type: "ping" }, function(pingResponse) {
      if (!pingResponse || chrome.runtime.lastError) {
        document.getElementById("chatStatus").innerHTML = `<span style="color: #dc3545;">❌ Extension not detected</span><br><small>Please install the <a href="https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac" target="_blank">APIKEY Connect extension</a> first</small>`;
        document.getElementById("connectKeyBtn").disabled = false;
        return;
      }
      // Try retrieving the default key
      chrome.runtime.sendMessage(EXTENSION_ID, { type: "requestKey", serviceId: "openai" }, function(response) {
        if (response && response.success) {
          handleSuccessfulConnection(response.key);
        } else {
          tryNextKeyName(0);
        }
      });
    });
    const commonKeyNames = [
      "OpenAI API", 
      "OpenAI",
      "Default OpenAI Key",
      "OpenAI Key",
      "Default Key",
      "Personal API Key"
    ];
    function tryNextKeyName(index) {
      if (index >= commonKeyNames.length) {
        document.getElementById("chatStatus").innerHTML = `<span style="color: #dc3545;">❌ No OpenAI key found</span><br><small>Please add an OpenAI key in your APIKEY Connect extension.</small><br><small>1. Click the extension icon</small><br><small>2. Select "OpenAI API" from the dropdown</small><br><small>3. Enter your API key</small><br><small>4. Click "Add Key"</small>`;
        document.getElementById("connectKeyBtn").disabled = false;
        return;
      }
      document.getElementById("chatStatus").innerHTML = `<span style="color: #6c757d;">⏳ Trying to find your key... (${index + 1}/${commonKeyNames.length})</span>`;
      chrome.runtime.sendMessage(EXTENSION_ID, { type: "requestKey", serviceId: "openai", keyName: commonKeyNames[index] }, function(response) {
        if (response && response.success) {
          handleSuccessfulConnection(response.key);
        } else {
          setTimeout(() => tryNextKeyName(index + 1), 300);
        }
      });
    }
    function handleSuccessfulConnection(key) {
      openAIKey = key;
      document.getElementById("chatStatus").innerHTML = `<span style="color: #28a745;">✅ API Key connected successfully!</span>`;
      connectKeyBtn.textContent = "Key Connected";
      connectKeyBtn.style.backgroundColor = "#6c757d";
      connectKeyBtn.disabled = false;
      setTimeout(() => { chatInput.focus(); }, 500);
    }
  }

  // Call OpenAI API
  async function callOpenAI(userMessage) {
    if (!openAIKey) {
      document.getElementById("chatStatus").innerHTML = `<span style='color: #dc3545;'>❌ Please connect your API key first.</span>`;
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
  // Add missing CSS styles for buttons
  addButtonStyles();

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

  const EXTENSION_ID = "edkgcdpbaggofodchjfkfiblhohmkbac";
  checkExtensionInstalled();

  const servicesGrid = document.getElementById('servicesGrid');
  if (servicesGrid) {
    services.forEach(service => {
      const card = document.createElement('div');
      card.className = 'service-card';
      card.dataset.serviceId = service.id;
      if (service.id === 'openai') card.classList.add('active');
      card.innerHTML = `<div class="service-icon">${service.icon}</div><div class="service-name">${service.name}</div>`;
      card.addEventListener('click', () => { selectService(service); });
      servicesGrid.appendChild(card);
    });
  }

  async function checkExtensionInstalled() {
    const statusEl = document.getElementById('extensionStatus');
    if (!statusEl) return;
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('span');
    const installPrompt = statusEl.querySelector('.install-prompt');
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        if (navigator.userAgent.indexOf("Chrome") !== -1) {
          statusDot.className = 'status-dot error';
          statusText.textContent = 'APIKEY Connect extension is not installed';
        } else {
          statusDot.className = 'status-dot error';
          statusText.textContent = 'Extension not available (browser not compatible)';
        }
        installPrompt.style.display = 'block';
        return false;
      }
      const response = await isExtensionInstalled();
      if (response) {
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

  async function isExtensionInstalled() {
    try {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000);
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(response && response.success);
        });
      });
    } catch (error) {
      console.error('Error checking extension:', error);
      return false;
    }
  }

  function selectService(service) {
    document.querySelectorAll('.service-card').forEach(card => { card.classList.remove('active'); });
    document.querySelector(`.service-card[data-service-id="${service.id}"]`).classList.add('active');
    document.getElementById('selectedServiceTitle').textContent = `${service.name} Integration`;
    document.getElementById('serviceId').value = service.serviceId;
    document.getElementById('keyName').value = service.keyName;
    document.getElementById('buttonText').value = service.buttonText;
    const previewButton = document.getElementById('previewButton');
    if (previewButton) {
      previewButton.textContent = service.buttonText;
      previewButton.className = 'apikey-connect-btn';
    }
    updateCodeSnippets();
  }

  const searchInput = document.getElementById('servicesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      document.querySelectorAll('.service-card').forEach(card => {
        const serviceName = card.querySelector('.service-name').textContent.toLowerCase();
        card.style.display = serviceName.includes(query) ? '' : 'none';
      });
    });
  }

  const outputTabs = document.querySelectorAll('.output-tab');
  outputTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabName}Tab`).classList.add('active');
    });
  });

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const codeElement = document.getElementById(targetId);
      navigator.clipboard.writeText(codeElement.textContent)
        .then(() => {
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg> Copied!`;
          setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
          }, 2000);
        })
        .catch(err => { console.error('Could not copy text: ', err); });
    });
  });

  const configInputs = document.querySelectorAll('#serviceId, #keyName, #buttonText, #framework');
  configInputs.forEach(input => {
    input.addEventListener('input', updateCodeSnippets);
  });

  enhancePreviewButton();

  function updateCodeSnippets() {
    const serviceId = document.getElementById('serviceId').value;
    const keyName = document.getElementById('keyName').value;
    const buttonText = document.getElementById('buttonText').value;
    const framework = document.getElementById('framework').value;
    const htmlCode = document.getElementById('htmlCode');
    htmlCode.innerHTML = `<!-- Add this button to your HTML -->
<button id="apiKeyProtectBtn" class="apikey-connect-btn">
  ${buttonText}
</button>
<!-- Add this div to display errors (optional) -->
<div id="apiKeyError" class="error-message" style="display: none;"></div>`;
    updateJSCodeSnippet();
    updateCSSCodeSnippet();
    const fullCode = document.getElementById('fullCode');
    fullCode.innerHTML = `<!-- Complete Integration Example -->
<html>
<head>
  <title>APIKEY Connect Integration Example</title>
  <style>
    /* Your CSS styles here */
  </style>
</head>
<body>
  <h1>APIKEY Connect Integration Example</h1>
  <!-- Integration code generated here -->
  <script>
    // Your JavaScript integration code here
  </script>
</body>
</html>`;
  }

  function addButtonStyles() {
    if (document.getElementById('enhanced-button-styles')) return;
    const style = document.createElement('style');
    style.id = 'enhanced-button-styles';
    style.textContent = `
      /* Button States */
      .apikey-connect-btn {
        position: relative;
        transition: all 0.3s ease;
      }
      .apikey-connect-btn.loading {
        background-color: #6366f1;
        cursor: wait;
      }
      .apikey-connect-btn.loading::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        border: 2px solid white;
        border-radius: 50%;
        border-top-color: transparent;
        right: 10px;
        animation: spin 1s linear infinite;
      }
      .apikey-connect-btn.success {
        background-color: #10b981;
      }
      .apikey-connect-btn.error {
        background-color: #ef4444;
      }
      .apikey-connect-btn.install-required {
        background-color: #f59e0b;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      /* Enhanced Preview Result */
      #previewResult {
        margin-top: 20px;
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function updateJSCodeSnippet() {
    const jsCode = document.getElementById('jsCode');
    if (!jsCode) return;
    const serviceId = document.getElementById('serviceId').value;
    const keyName = document.getElementById('keyName').value;
    const buttonText = document.getElementById('buttonText').value;
    jsCode.innerHTML = `// Add this JavaScript to your page
document.addEventListener('DOMContentLoaded', function() {
  const apiKeyProtectBtn = document.getElementById('apiKeyProtectBtn');
  const apiKeyError = document.getElementById('apiKeyError');
  // Extension ID for APIKEY Connect
  const EXTENSION_ID = 'edkgcdpbaggofodchjfkfiblhohmkbac';
  // Function to show error messages
  function showError(message) {
    if (apiKeyError) {
      apiKeyError.textContent = message;
      apiKeyError.style.display = 'block';
      setTimeout(() => { apiKeyError.style.display = 'none'; }, 5000);
    } else {
      alert(message);
    }
  }
  // Function to check if extension is installed
  async function checkExtension() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        return false;
      }
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
          const error = chrome.runtime.lastError;
          if (error) { resolve(false); return; }
          resolve(response && response.success);
        });
      });
    } catch (error) { return false; }
  }
  // Button click handler
  apiKeyProtectBtn.addEventListener('click', async function() {
    try {
      apiKeyProtectBtn.disabled = true;
      apiKeyProtectBtn.classList.add('loading');
      apiKeyProtectBtn.textContent = 'Checking...';
      const isInstalled = await checkExtension();
      if (!isInstalled) {
        if (confirm('The APIKEY Connect extension is required but not installed. Would you like to install it now?')) {
          window.open('https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac', '_blank');
        }
        apiKeyProtectBtn.classList.remove('loading');
        apiKeyProtectBtn.classList.add('install-required');
        apiKeyProtectBtn.textContent = 'Install Extension First';
        setTimeout(() => {
          apiKeyProtectBtn.classList.remove('install-required');
          apiKeyProtectBtn.disabled = false;
          apiKeyProtectBtn.textContent = '${buttonText}';
        }, 5000);
        return;
      }
      apiKeyProtectBtn.textContent = 'Requesting API Key...';
      const response = await chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: "requestKey",
          serviceId: "${serviceId}",
          keyName: "${keyName}"
        }
      );
      if (response && response.success) {
        const apiKey = response.key;
        apiKeyProtectBtn.classList.remove('loading');
        apiKeyProtectBtn.classList.add('success');
        apiKeyProtectBtn.textContent = 'Key Received!';
        console.log('API Key received:', apiKey.substring(0, 3) + '...');
        useApiKey(apiKey);
        setTimeout(() => {
          apiKeyProtectBtn.classList.remove('success');
          apiKeyProtectBtn.disabled = false;
          apiKeyProtectBtn.textContent = '${buttonText}';
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to get API key');
      }
    } catch (error) {
      console.error('Error requesting API key:', error);
      apiKeyProtectBtn.classList.remove('loading');
      apiKeyProtectBtn.classList.add('error');
      apiKeyProtectBtn.textContent = 'Error!';
      showError('Error requesting API key: ' + error.message);
      setTimeout(() => {
        apiKeyProtectBtn.classList.remove('error');
        apiKeyProtectBtn.disabled = false;
        apiKeyProtectBtn.textContent = '${buttonText}';
      }, 2000);
    }
  });
  // Example function to use the API key
  function useApiKey(apiKey) {
    fetch('https://api.${serviceId}.com/v1/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      },
      body: JSON.stringify({
        // Your request payload
      })
    })
    .then(response => response.json())
    .then(data => console.log('API response:', data))
    .catch(error => console.error('API request failed:', error));
  }
});
`;
  }

  function updateCSSCodeSnippet() {
    const cssCode = document.getElementById('cssCode');
    if (!cssCode) return;
    cssCode.innerHTML = `/* Add this CSS to your stylesheet */
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
  transition: all 0.3s ease;
  position: relative;
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
.apikey-connect-btn.loading {
  background-color: #6366f1;
  cursor: wait;
}
.apikey-connect-btn.loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-radius: 50%;
  border-top-color: transparent;
  right: 10px;
  animation: spin 1s linear infinite;
}
.apikey-connect-btn.success {
  background-color: #10b981;
}
.apikey-connect-btn.error {
  background-color: #ef4444;
}
.apikey-connect-btn.install-required {
  background-color: #f59e0b;
}
@keyframes spin {
  to { transform: rotate(360deg); }
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
  }

  function enhancePreviewButton() {
    const previewButton = document.getElementById('previewButton');
    if (!previewButton) return;
    previewButton.onclick = async function() {
      const serviceId = document.getElementById('serviceId').value;
      const keyName = document.getElementById('keyName').value;
      const previewResult = document.getElementById('previewResult');
      if (previewResult) {
        previewResult.style.display = 'none';
        previewResult.innerHTML = '';
      }
      this.disabled = true;
      this.classList.add('loading');
      const originalText = this.textContent;
      this.textContent = 'Checking...';
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
          throw new Error('Your browser does not support Chrome extensions. Please use Chrome, Edge, or another Chromium-based browser.');
        }
        const isInstalled = await isExtensionInstalled();
        if (!isInstalled) {
          if (previewResult) {
            previewResult.innerHTML = `
              <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1e293b;">APIKeyConnect Extension Required</h3>
                <p style="margin-bottom: 20px; color: #475569;">To use this feature, you need to install the APIKeyConnect extension.</p>
                <a href="https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s ease;">Install Extension</a>
                <p style="margin-top: 16px; font-size: 14px; color: #64748b;">After installing, please refresh this page to continue.</p>
              </div>
            `;
            previewResult.style.display = 'block';
          }
          this.classList.remove('loading');
          this.classList.add('install-required');
          this.textContent = 'Install Extension First';
          setTimeout(() => {
            this.classList.remove('install-required');
            this.disabled = false;
            this.textContent = originalText;
          }, 5000);
          return;
        }
        this.textContent = 'Requesting API Key...';
        const response = await chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            type: "requestKey",
            serviceId: serviceId,
            keyName: keyName
          }
        );
        if (response && response.success) {
          this.classList.remove('loading');
          this.classList.add('success');
          this.textContent = 'Key Received!';
          if (previewResult) {
            previewResult.innerHTML = `
              <div style="padding: 16px; background-color: #d1fae5; border-radius: 8px; color: #065f46; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="font-size: 18px;">✅</div>
                  <div>
                    <strong style="font-weight: 600;">Success!</strong> 
                    <span>API key received (${response.key.substring(0, 3)}...)</span>
                  </div>
                </div>
              </div>
            `;
            previewResult.style.display = 'block';
          }
          setTimeout(() => {
            this.classList.remove('success');
            this.disabled = false;
            this.textContent = originalText;
          }, 2000);
        } else {
          throw new Error(response?.error || 'Failed to get API key');
        }
      } catch (error) {
        console.error('Preview button error:', error);
        this.classList.remove('loading');
        this.classList.add('error');
        this.textContent = 'Error!';
        if (previewResult) {
          previewResult.innerHTML = `
            <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px; color: #b91c1c; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 18px;">❌</div>
                <div>
                  <strong style="font-weight: 600;">Error:</strong> 
                  <span>${error.message || 'Unknown error occurred'}</span>
                </div>
              </div>
            </div>
          `;
          previewResult.style.display = 'block';
        }
        setTimeout(() => {
          this.classList.remove('error');
          this.disabled = false;
          this.textContent = originalText;
        }, 2000);
      }
    };
  }
}
