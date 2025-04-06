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
          <br><small>Please install the <a href="https://chromewebstore.google.com/detail/apikeyconnect/edkgcdpbaggofodchjfkfiblhohmkbac" target="_blank">APIKeyConnect extension</a> first</small>
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
          <br><small>Please add an OpenAI key in your APIKeyConnect extension.</small>
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
    { id: 'openai', name: 'OpenAI', icon: '🤖', keyFormat: 'sk_xxxx...', serviceId: 'openai', keyName: 'My OpenAI Key', buttonText: 'Use My OpenAI API Key' },
    { id: 'stripe', name: 'Stripe', icon: '💳', keyFormat: 'sk_test_xxxx...', serviceId: 'stripe', keyName: 'My Stripe Key', buttonText: 'Use My Stripe API Key' },
    { id: 'aws', name: 'AWS', icon: '☁️', keyFormat: 'AKIA...', serviceId: 'aws', keyName: 'My AWS Key', buttonText: 'Use My AWS API Key' },
    { id: 'google_maps', name: 'Google Maps', icon: '🗺️', keyFormat: 'AIza...', serviceId: 'google_maps', keyName: 'My Google Maps Key', buttonText: 'Use My Google Maps API Key' },
    { id: 'twilio', name: 'Twilio', icon: '📱', keyFormat: 'SK...', serviceId: 'twilio', keyName: 'My Twilio Key', buttonText: 'Use My Twilio API Key' },
    { id: 'github', name: 'GitHub', icon: '📦', keyFormat: 'ghp_...', serviceId: 'github', keyName: 'My GitHub Token', buttonText: 'Use My GitHub Token' },
    { id: 'twitter', name: 'Twitter', icon: '🐦', keyFormat: 'AAAA...', serviceId: 'twitter', keyName: 'My Twitter API Key', buttonText: 'Use My Twitter API Key' },
    { id: 'coinbase', name: 'Coinbase', icon: '₿', keyFormat: 'xxxx-xxxx...', serviceId: 'coinbase', keyName: 'My Coinbase API Key', buttonText: 'Use My Coinbase API Key' },
    { id: 'azure', name: 'Azure', icon: '☁️', keyFormat: 'ApiKey...', serviceId: 'azure', keyName: 'My Azure API Key', buttonText: 'Use My Azure API Key' },
    { id: 'anthropic', name: 'Anthropic', icon: '🧠', keyFormat: 'sk-ant-...', serviceId: 'anthropic', keyName: 'My Claude API Key', buttonText: 'Use My Claude API Key' },
    { id: 'cohere', name: 'Cohere', icon: '💬', keyFormat: 'Co...', serviceId: 'cohere', keyName: 'My Cohere API Key', buttonText: 'Use My Cohere API Key' },
    { id: 'cloudflare', name: 'Cloudflare', icon: '☁️', keyFormat: 'xxxx...', serviceId: 'cloudflare', keyName: 'My Cloudflare API Key', buttonText: 'Use My Cloudflare API Key' }
  ];

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
    document.getElementById('previewButton').textContent = service.buttonText;
    
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
    previewButton.addEventListener('click', () => {
      alert('The API Key Protect extension is needed to use this feature. This is just a preview of how the button would look on your website.');
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
&lt;<span class="key">button</span> <span class="key">id</span>=<span class="value">"apiKeyProtectBtn"</span> <span class="key">class</span>=<span class="value">"api-key-protect-btn"</span>&gt;
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
  
  apiKeyProtectBtn.addEventListener('click', async function() {
    try {
      <span class="comment">// Check if the extension is available</span>
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        showError('Please install the API Key Protect extension to use this feature.');
        return;
      }
      
      <span class="comment">// Request the API key from the extension</span>
      const response = await chrome.runtime.sendMessage(
        'pkoblmlbdfdlhjbgjlhmpgkpfnkkfmej', <span class="comment">// Extension ID</span>
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
    }
  });
  
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
    
    // Update full code
    const fullCode = document.getElementById('fullCode');
    fullCode.innerHTML = `<span class="comment">&lt;!-- Complete Integration Example --&gt;</span>
&lt;<span class="key">html</span>&gt;
&lt;<span class="key">head</span>&gt;
  &lt;<span class="key">style</span>&gt;
    .api-key-protect-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background-color: #007bff;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .api-key-protect-btn::before {
      content: '🔑';
      display: inline-block;
    }
    
    .api-key-protect-btn:hover {
      background-color: #0056b3;
    }
    
    .api-key-protect-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .error-message {
      margin-top: 0.5rem;
      padding: 0.5rem;
      color: #721c24;
      background-color: #f8d7da;
      border-radius: 4px;
    }
  &lt;/<span class="key">style</span>&gt;
&lt;/<span class="key">head</span>&gt;
&lt;<span class="key">body</span>&gt;
  &lt;<span class="key">h1</span>&gt;API Key Protect Integration Example&lt;/<span class="key">h1</span>&gt;
  
  &lt;<span class="key">p</span>&gt;Click the button below to provide your API key securely:&lt;/<span class="key">p</span>&gt;
  
  &lt;<span class="key">button</span> <span class="key">id</span>=<span class="value">"apiKeyProtectBtn"</span> <span class="key">class</span>=<span class="value">"api-key-protect-btn"</span>&gt;
    ${buttonText}
  &lt;/<span class="key">button</span>&gt;
  
  &lt;<span class="key">div</span> <span class="key">id</span>=<span class="value">"apiKeyError"</span> <span class="key">class</span>=<span class="value">"error-message"</span> <span class="key">style</span>=<span class="value">"display: none;"</span>&gt;&lt;/<span class="key">div</span>&gt;
  
  &lt;<span class="key">div</span> <span class="key">id</span>=<span class="value">"result"</span> <span class="key">style</span>=<span class="value">"margin-top: 20px;"</span>&gt;&lt;/<span class="key">div</span>&gt;
  
  &lt;<span class="key">script</span>&gt;
    document.addEventListener('DOMContentLoaded', function() {
      const apiKeyProtectBtn = document.getElementById('apiKeyProtectBtn');
      const apiKeyError = document.getElementById('apiKeyError');
      const resultDiv = document.getElementById('result');
      
      apiKeyProtectBtn.addEventListener('click', async function() {
        try {
          // Check if the extension is available
          if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            showError('Please install the API Key Protect extension to use this feature.');
            return;
          }
          
          // Request the API key from the extension
          const response = await chrome.runtime.sendMessage(
            'pkoblmlbdfdlhjbgjlhmpgkpfnkkfmej', // Extension ID
            {
              type: "requestKey",
              serviceId: "${serviceId}",      // Specify the service ID
              keyName: "${keyName}"  // Specify the key name
            }
          );
          
          if (response && response.success) {
            // Success! You now have the API key
            const apiKey = response.key;
            
            // Show success message
            resultDiv.innerHTML = \`
              &lt;div style="padding: 10px; background-color: #d4edda; color: #155724; border-radius: 4px;"&gt;
                API key received successfully! Key starts with: \${apiKey.substring(0, 3)}...
              &lt;/div&gt;
            \`;
            
            // Use the API key to make requests
            useApiKey(apiKey);
          } else {
            // Handle error or rejection
            showError(response?.error || 'Failed to get API key');
          }
        } catch (error) {
          console.error('Error requesting API key:', error);
          showError('Error requesting API key. Is the extension installed?');
        }
      });
      
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
      
      function useApiKey(apiKey) {
        // Example function to use the API key for requests
        // Replace this with your actual API calls
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
        .then(data => {
          console.log('API response:', data);
          resultDiv.innerHTML += \`
            &lt;div style="margin-top: 10px; padding: 10px; background-color: #d1ecf1; color: #0c5460; border-radius: 4px;"&gt;
              &lt;h3&gt;API Response:&lt;/h3&gt;
              &lt;pre style="white-space: pre-wrap;"&gt;\${JSON.stringify(data, null, 2)}&lt;/pre&gt;
            &lt;/div&gt;
          \`;
        })
        .catch(error => {
          console.error('API request failed:', error);
          resultDiv.innerHTML += \`
            &lt;div style="margin-top: 10px; padding: 10px; background-color: #f8d7da; color: #721c24; border-radius: 4px;"&gt;
              API request failed: \${error.message}
            &lt;/div&gt;
          \`;
        });
      }
    });
  &lt;/<span class="key">script</span>&gt;
&lt;/<span class="key">body</span>&gt;
&lt;/<span class="key">html</span>&gt;`;
  }
}
