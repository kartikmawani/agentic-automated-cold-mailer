document.getElementById('ingest-btn').addEventListener('click', async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;
  
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          // 1. Define the event handler at the top so it is safely initialized
          const handleEngineTransmission = async (e) => {
            const clickedButton = e.currentTarget;
            
            // Traverse up the tree to locate the root card wrapper
            const cardComponent = clickedButton.closest(".flex");
            if (!cardComponent) return;
  
            // Locate the specific nested text element holding the company string
            const companyComponent = cardComponent.querySelector(".text-neutral-1000");
            const companyName = companyComponent?.textContent?.trim() || "Unknown Target";
  
            console.log(`📡 Transmitting captured element text node: ${companyName}`);
  
            // Provide visual execution loading feedback inside the webpage DOM row
            clickedButton.innerText = "⏳ Sending...";
            clickedButton.disabled = true;
  
            try {
                // FIRE DIRECTLY TO EXPRESS: Only pass the company name as the root seed
                const response = await fetch('http://localhost:4000/api/leads', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ companyName }) // <-- Pure and simple
                });
              
                if (response.status === 202) {
                  clickedButton.innerText = "Queued ✔️";
                  clickedButton.style.backgroundColor = "#22c55e"; 
                  clickedButton.style.color = "#ffffff";
                } else {
                  throw new Error("Local Express engine rejected connection parameters.");
                }
              } catch (err) {
                console.error("Queue dispatch broken:", err);
                clickedButton.innerText = "❌ Fail";
                clickedButton.disabled = false;
              }
          };
  
          // 2. Query target classes securely using the correct dot indicator
          const targetingDivs = document.querySelectorAll(".styles_component__uTjje");
          
          targetingDivs.forEach((div) => {
            // Prevent multiple tracking button injections if clicked repeatedly
            if (div.querySelector(".mcp-injected-trigger")) return;
  
            const button = document.createElement("button");
            button.className = "mcp-injected-trigger";
            button.innerText = "Send to Engine";
            
            // Basic micro-stylings to make the button look clean on the target platform UI
            button.style.marginLeft = "12px";
            button.style.padding = "4px 8px";
            button.style.borderRadius = "4px";
            button.style.cursor = "pointer";
            button.style.backgroundColor = "#0284c7";
            button.style.color = "white";
            button.style.border = "none";
            button.style.fontSize = "12px";
            button.style.fontWeight = "bold";
  
            // Wire the listener execution path securely
            button.addEventListener('click', handleEngineTransmission);
            div.appendChild(button);
          });
        }
      });
  
      // Notify popup environment that the injection phase passed checks
      document.getElementById('output').innerText = "Buttons successfully mounted down the page list matrix.";
    } catch (error) {
      console.error("Script execution layout collapsed:", error);
    }
  });