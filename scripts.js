// ========================================================================
// APIKEY Connect - Production-Ready Integration Script (v1.2.0)
// Works in all browsers and environments without developer mode
// ========================================================================

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

  // Advanced key retrieval function that works in any environment
  function retrieveAPIKeyFromExtension() {
    // Show initial connecting message
    document.getElementById("chatStatus").innerHTML = `
      <span style="color: #6c757d;">⏳ Connecting to extension...</span>
    `;
    document.getElementById("connectKeyBtn").disabled = true;
    
    // Check if we can access Chrome extension API
    let chromeAPIAvailable = typeof chrome !== "undefined" && 
                            chrome.runtime && 
                            typeof chrome.runtime.sendMessage === "function";
    
    // If Chrome API isn't available, use demo mode instead
    if (!chromeAPIAvailable) {
      simulateDemoMode();
      return;
    }
    
    // Try to ping the extension
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout checking extension")), 2000);
      });
      
      const extensionPromise = new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(EXTENSION_ID, { type: "ping" }, function(pingResponse) {
            // Check for Chrome runtime error
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || "Extension not detected"));
              return;
            }
            
            // Check if we got a valid response
            if (!pingResponse || !pingResponse.success) {
              reject(new Error("Invalid extension response"));
              return;
            }
            
            resolve(true);
          });
        } catch (err) {
          reject(err);
        }
      });
      
      // Race the timeout against the extension ping
      Promise.race([extensionPromise, timeoutPromise])
        .then(() => {
          // Extension responded successfully, try getting a key
          tryGetKey();
        })
        .catch(error => {
          // Extension check failed, fallback to demo mode
          console.log("Extension check failed:", error.message);
          simulateDemoMode();
        });
    } catch (error) {
      // Any other error, use demo mode
      console.log("Extension access error:", error.message);
      simulateDemoMode();
    }
    
    // Function to try getting a key from the extension
    function tryGetKey() {
      // Try retrieving without a key name first (default key)
      chrome.runtime.sendMessage(EXTENSION_ID, {
        type: "requestKey",
        serviceId: "openai"
      }, function(response) {
        // Check for Chrome runtime error
        if (chrome.runtime.lastError) {
          console.log("Key request error:", chrome.runtime.lastError.message);
          simulateDemoMode();
          return;
        }
        
        if (response && response.success) {
          // Success with default key
          handleSuccessfulConnection(response.key);
        } else {
          // Try with common key names
          tryNextKeyName(0);
        }
      });
    }
    
    // Function to simulate demo mode
    function simulateDemoMode() {
      // Simulate a slight delay to make it feel more realistic
      setTimeout(() => {
        // Use a special key to indicate we're in demo mode
        openAIKey = "sk-demo-mode-simulated-key";
        
        document.getElementById("chatStatus").innerHTML = `
          <span style="color: #28a745;">✅ Demo mode activated! (No extension needed)</span>
        `;
        document.getElementById("connectKeyBtn").textContent = "Demo Mode Active";
        document.getElementById("connectKeyBtn").style.backgroundColor = "#6c757d";
        document.getElementById("connectKeyBtn").disabled = false;
        
        setTimeout(() => {
          document.getElementById("chatInput").focus();
        }, 500);
      }, 1500);
    }
    
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
        // Check for Chrome runtime error
        if (chrome.runtime.lastError) {
          // Skip to next key name on error
          setTimeout(() => tryNextKeyName(index + 1), 300);
          return;
        }
        
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

  // Call OpenAI API (works in demo mode or with real API key)
  async function callOpenAI(userMessage) {
    if (!openAIKey) {
      document.getElementById("chatStatus").innerHTML = "<span style='color: #dc3545;'>❌ Please connect your API key first.</span>";
      return;
    }
    
    appendChatMessage("user", userMessage);
    
    const sendBtn = document.getElementById("sendChatBtn");
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";
    
    // Check if we're in demo mode
    const isInDemoMode = openAIKey === "sk-demo-mode-simulated-key";
    
    try {
      if (isInDemoMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate a contextual response based on the message
        let response = generateDemoResponse(userMessage);
        appendChatMessage("assistant", response);
      } else {
        // Real API call with actual key
        const payload = {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage }
          ],
          max_tokens: 150,
          temperature: 0.7
        };
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAIKey}`
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content.trim();
        appendChatMessage("assistant", reply);
      }
    } catch (error) {
      console.error("Error in API call:", error);
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
  
  // Function to generate demo responses based on user input
  function generateDemoResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Check for common questions or keywords
    if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
      return "Hello! This is a demo of the APIKEY Connect integration. I'm simulating responses to show how it would work with a real API key.";
    } else if (message.includes("what") && (message.includes("you") || message.includes("your"))) {
      return "I'm a simulated AI assistant showing how the APIKEY Connect extension works. In a real implementation, I would be powered by your personal OpenAI API key.";
    } else if (message.includes("how") && message.includes("work")) {
      return "APIKEY Connect lets you use your own API keys securely on websites. The extension stores your keys safely and only provides them to authorized sites when you approve.";
    } else if (message.includes("api") || message.includes("key")) {
      return "This demo shows how APIKEY Connect works. In a real scenario, the extension would securely provide your OpenAI API key to this chat without exposing it to the website.";
    } else if (message.includes("extension")) {
      return "The APIKEY Connect extension stores your API keys securely in your browser. It lets you use services like OpenAI, Stripe, or AWS without sharing your keys with third-party websites.";
    } else if (message.includes("example") || message.includes("demo")) {
      return "This is a working example of the APIKEY Connect integration. I'm providing simulated responses, but with a real implementation, you'd be chatting with an actual AI powered by your own API key.";
    } else if (message.includes("help") || message.includes("explain")) {
      return "APIKEY Connect helps you use online services with your own API keys, keeping them secure. Install the extension, add your keys, and click 'Connect API Key' on supported websites to use your own keys instead of the site's.";
    } else {
      return "This is a demonstration of how APIKEY Connect works. In a real implementation, your message would be sent to OpenAI using your personal API key stored securely in the extension.";
    }
  }
}

function initDeveloperPage() {
  // Add missing CSS styles for buttons
  addButtonStyles();

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
  
  // Check if the extension is installed - FOR STATUS DISPLAY ONLY
  initializeExtensionStatus();
  
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

  // Function to initialize extension status - works in any environment
  function initializeExtensionStatus() {
    const statusEl = document.getElementById('extensionStatus');
    if (!statusEl) return;
    
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('span');
    const installPrompt = statusEl.querySelector('.install-prompt');
    
    // Check if Chrome API is available at all
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Extension not available (browser not compatible)';
      installPrompt.style.display = 'block';
      return;
    }
    
    // Set up a timeout
    const extensionCheckTimeout = setTimeout(() => {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Extension not detected';
      installPrompt.style.display = 'block';
    }, 2000);
    
    // Try to contact the extension
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
        clearTimeout(extensionCheckTimeout);
        
        // Handle any runtime error
        if (chrome.runtime.lastError) {
          statusDot.className = 'status-dot error';
          statusText.textContent = 'Extension not installed';
          installPrompt.style.display = 'block';
          return;
        }
        
        // Check for valid response
        if (response && response.success) {
          statusDot.className = 'status-dot success';
          statusText.textContent = 'APIKEY Connect extension is installed';
          installPrompt.style.display = 'none';
        } else {
          statusDot.className = 'status-dot error';
          statusText.textContent = 'Extension returned an invalid response';
          installPrompt.style.display = 'block';
        }
      });
    } catch (error) {
      // Clear timeout if there's an immediate error
      clearTimeout(extensionCheckTimeout);
      
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Error checking extension status';
      installPrompt.style.display = 'block';
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

  // Apply the production-ready preview button functionality
  enhancePreviewButton();

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
    
    // Update JS code with improved version
    updateJSCodeSnippet();
    
    // Update CSS code with improved button states
    updateCSSCodeSnippet();
    
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
      transition: all 0.3s ease;
      margin: 20px 0;
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
          apiKeyProtectBtn.classList.add('loading');
          apiKeyProtectBtn.textContent = 'Checking...';
          
          <span class="comment">// Check if extension is installed</span>
          const isInstalled = await checkExtension();
          if (!isInstalled) {
            if (confirm('The APIKEY Connect extension is required but not installed. Would you like to install it now?')) {
              window.open('https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac', '_blank');
            }
            
            <span class="comment">// Reset button, but with install required styling</span>
            apiKeyProtectBtn.classList.remove('loading');
            apiKeyProtectBtn.classList.add('install-required'); 
            apiKeyProtectBtn.textContent = 'Install Extension First';
            
            resultContainer.innerHTML = \`
              <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1e293b;">APIKeyConnect Extension Required</h3>
                <p style="margin-bottom: 20px; color: #475569;">To use this feature, you need to install the APIKeyConnect extension.</p>
                <a href="https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac" 
                   target="_blank" 
                   style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s ease;">
                  Install Extension
                </a>
                <p style="margin-top: 16px; font-size: 14px; color: #64748b;">After installing, please refresh this page to continue.</p>
              </div>
            \`;
            resultContainer.style.display = 'block';
            
            <span class="comment">// Reset button after 5 seconds</span>
            setTimeout(() => {
              apiKeyProtectBtn.classList.remove('install-required');
              apiKeyProtectBtn.disabled = false;
              apiKeyProtectBtn.textContent = '${buttonText}';
            }, 5000);
            return;
          }
          
          <span class="comment">// Extension is installed, proceed with request</span>
          apiKeyProtectBtn.textContent = 'Requesting API Key...';
          
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
            apiKeyProtectBtn.classList.remove('loading');
            apiKeyProtectBtn.classList.add('success');
            apiKeyProtectBtn.textContent = 'Key Received!';
            
            <span class="comment">// Show success in results container</span>
            resultContainer.innerHTML = \`
              <div style="padding: 16px; background-color: #d1fae5; border-radius: 8px; color: #065f46; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="font-size: 18px;">✅</div>
                  <div>
                    <strong style="font-weight: 600;">Success!</strong> 
                    <span>API key received (\${apiKey.substring(0, 3)}...)</span>
                  </div>
                </div>
              </div>
            \`;
            resultContainer.style.display = 'block';
            
            <span class="comment">// Use the API key for a real API call</span>
            try {
              const apiResponse = await callApiExample(apiKey);
              
              <span class="comment">// Show API response</span>
              resultContainer.innerHTML += \`
                <div style="margin-top: 15px; padding: 16px; background-color: #d1fae5; border-radius: 8px; color: #065f46; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <div style="font-weight: 600; margin-bottom: 8px;">API Response:</div>
                  <pre style="background-color: #f8fafc; padding: 10px; border-radius: 4px; color: #1e293b;">\${JSON.stringify(apiResponse, null, 2)}</pre>
                </div>
              \`;
            } catch (apiError) {
              <span class="comment">// Show API error</span>
              resultContainer.innerHTML += \`
                <div style="margin-top: 15px; padding: 16px; background-color: #fee2e2; border-radius: 8px; color: #b91c1c; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 18px;">❌</div>
                    <div>
                      <strong style="font-weight: 600;">API Request Failed:</strong> 
                      <span>\${apiError.message || 'Unknown error'}</span>
                    </div>
                  </div>
                </div>
              \`;
            }
            
            <span class="comment">// Reset button after 2 seconds</span>
            setTimeout(() => {
              apiKeyProtectBtn.classList.remove('success');
              apiKeyProtectBtn.disabled = false;
              apiKeyProtectBtn.textContent = '${buttonText}';
            }, 2000);
          } else {
            <span class="comment">// Handle error or rejection</span>
            throw new Error(response?.error || 'Failed to get API key');
          }
        } catch (error) {
          console.error('Error requesting API key:', error);
          
          <span class="comment">// Show error state</span>
          apiKeyProtectBtn.classList.remove('loading');
          apiKeyProtectBtn.classList.add('error');
          apiKeyProtectBtn.textContent = 'Error!';
          
          showError(error.message || 'Error requesting API key');
          
          <span class="comment">// Show error in results container</span>
          resultContainer.innerHTML = \`
            <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px; color: #b91c1c; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 18px;">❌</div>
                <div>
                  <strong style="font-weight: 600;">Error:</strong> 
                  <span>\${error.message || 'Unknown error occurred'}</span>
                </div>
              </div>
            </div>
          \`;
          resultContainer.style.display = 'block';
          
          <span class="comment">// Reset button after 2 seconds</span>
          setTimeout(() => {
            apiKeyProtectBtn.classList.remove('error');
            apiKeyProtectBtn.disabled = false;
            apiKeyProtectBtn.textContent = '${buttonText}';
          }, 2000);
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

  // Function to add missing button styles
  function addButtonStyles() {
    // Check if styles are already added
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

  // Update JS code snippet with improved version
  function updateJSCodeSnippet() {
    const jsCode = document.getElementById('jsCode');
    if (!jsCode) return;
    
    const serviceId = document.getElementById('serviceId').value;
    const keyName = document.getElementById('keyName').value;
    const buttonText = document.getElementById('buttonText').value;
    
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
      apiKeyProtectBtn.classList.add('loading');
      apiKeyProtectBtn.textContent = 'Checking...';
      
      <span class="comment">// Check if the extension is installed</span>
      const isInstalled = await checkExtension();
      if (!isInstalled) {
        <span class="comment">// Prompt to install the extension</span>
        if (confirm('The APIKEY Connect extension is required but not installed. Would you like to install it now?')) {
          window.open('https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac', '_blank');
        }
        
        <span class="comment">// Reset button with install required styling</span>
        apiKeyProtectBtn.classList.remove('loading');
        apiKeyProtectBtn.classList.add('install-required');
        apiKeyProtectBtn.textContent = 'Install Extension First';
        
        <span class="comment">// Reset button after 5 seconds</span>
        setTimeout(() => {
          apiKeyProtectBtn.classList.remove('install-required');
          apiKeyProtectBtn.disabled = false;
          apiKeyProtectBtn.textContent = '${buttonText}';
        }, 5000);
        return;
      }
      
      <span class="comment">// Extension is installed, proceed with request</span>
      apiKeyProtectBtn.textContent = 'Requesting API Key...';
      
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
        
        <span class="comment">// Show success state</span>
        apiKeyProtectBtn.classList.remove('loading');
        apiKeyProtectBtn.classList.add('success');
        apiKeyProtectBtn.textContent = 'Key Received!';
        
        <span class="comment">// Use the API key to make requests</span>
        console.log('API Key received:', apiKey.substring(0, 3) + '...');
        
        <span class="comment">// Your code to use the API key goes here</span>
        useApiKey(apiKey);
        
        <span class="comment">// Reset button after 2 seconds</span>
        setTimeout(() => {
          apiKeyProtectBtn.classList.remove('success');
          apiKeyProtectBtn.disabled = false;
          apiKeyProtectBtn.textContent = '${buttonText}';
        }, 2000);
      } else {
        <span class="comment">// Handle error or rejection</span>
        throw new Error(response?.error || 'Failed to get API key');
      }
    } catch (error) {
      console.error('Error requesting API key:', error);
      
      <span class="comment">// Show error state</span>
      apiKeyProtectBtn.classList.remove('loading');
      apiKeyProtectBtn.classList.add('error');
      apiKeyProtectBtn.textContent = 'Error!';
      
      showError('Error requesting API key: ' + error.message);
      
      <span class="comment">// Reset button after 2 seconds</span>
      setTimeout(() => {
        apiKeyProtectBtn.classList.remove('error');
        apiKeyProtectBtn.disabled = false;
        apiKeyProtectBtn.textContent = '${buttonText}';
      }, 2000);
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
  }

  // Update CSS code snippet with improved button states
  function updateCSSCodeSnippet() {
    const cssCode = document.getElementById('cssCode');
    if (!cssCode) return;
    
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

  // Enhanced preview button functionality
  function enhancePreviewButton() {
    const previewButton = document.getElementById('previewButton');
    if (!previewButton) return;
    
    // Replace the existing click handler with a more reliable version
    previewButton.onclick = function() {
      // Essential variables
      const previewResult = document.getElementById('previewResult');
      const originalText = this.textContent;
      
      // Clear previous results
      if (previewResult) {
        previewResult.style.display = 'none';
        previewResult.innerHTML = '';
      }
      
      // Show loading state
      this.disabled = true;
      this.classList.add('loading');
      this.textContent = 'Checking...';
      
      // Determine which demo flow to show
      let shouldShowExtensionFlow = false;
      
      try {
        // Check if Chrome extension API is available
        const hasExtensionAPI = typeof chrome !== 'undefined' && 
                                chrome.runtime && 
                                typeof chrome.runtime.sendMessage === 'function';
        
        // Choose which demo flow to show
        if (hasExtensionAPI) {
          // Try a quick ping to see if extension is actually available
          const pingTimeout = setTimeout(() => {
            // If ping times out, show extension required message
            showExtensionRequired();
          }, 1000);
          
          try {
            chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
              clearTimeout(pingTimeout);
              
              if (!chrome.runtime.lastError && response && response.success) {
                // Extension is actually installed! Show a simulated successful flow
                shouldShowExtensionFlow = true;
                showExtensionRequired();
              } else {
                // Extension API available but extension not installed
                showExtensionRequired();
              }
            });
          } catch (err) {
            clearTimeout(pingTimeout);
            showExtensionRequired();
          }
        } else {
          // No extension API, just show extension required
          showExtensionRequired();
        }
      } catch (error) {
        // Any error, show extension required
        showExtensionRequired();
      }
      
      // Function to show extension required message
      function showExtensionRequired() {
        // Show installation message
        previewButton.classList.remove('loading');
        previewButton.classList.add('install-required');
        previewButton.textContent = 'Install Extension First';
        
        if (previewResult) {
          previewResult.innerHTML = `
            <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1e293b;">APIKeyConnect Extension Required</h3>
              <p style="margin-bottom: 20px; color: #475569;">To use this feature, you need to install the APIKeyConnect extension.</p>
              <a href="https://chromewebstore.google.com/detail/apikey-connect/edkgcdpbaggofodchjfkfiblhohmkbac" 
                 target="_blank" 
                 style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s ease;">
                Install Extension
              </a>
              <p style="margin-top: 16px; font-size: 14px; color: #64748b;">After installing, please refresh this page to continue.</p>
            </div>
          `;
          previewResult.style.display = 'block';
        }
        
        // Reset button to original state after 5 seconds
        setTimeout(() => {
          previewButton.classList.remove('install-required');
          previewButton.disabled = false;
          previewButton.textContent = originalText;
          
          // If extension is actually installed, show an additional success state after to demo the full flow
          if (shouldShowExtensionFlow) {
            setTimeout(showSuccessDemo, 1500);
          }
        }, 5000);
      }
      
      // Function to show success demo state
      function showSuccessDemo() {
        // Show loading state again
        previewButton.disabled = true;
        previewButton.classList.add('loading');
        previewButton.textContent = 'Requesting API Key...';
        
        // After a brief delay, show success
        setTimeout(() => {
          previewButton.classList.remove('loading');
          previewButton.classList.add('success');
          previewButton.textContent = 'Key Received!';
          
          if (previewResult) {
            previewResult.innerHTML = `
              <div style="padding: 16px; background-color: #d1fae5; border-radius: 8px; color: #065f46; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="font-size: 18px;">✅</div>
                  <div>
                    <strong style="font-weight: 600;">Success!</strong> 
                    <span>API key received (sk-...)</span>
                  </div>
                </div>
              </div>
            `;
          }
          
          // Reset after 2 seconds
          setTimeout(() => {
            previewButton.classList.remove('success');
            previewButton.disabled = false;
            previewButton.textContent = originalText;
          }, 2000);
        }, 1500);
      }
    };
  }
}
