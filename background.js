let currentArticles = [];
let contentScriptInjected = false;
let isExtracting = false;
let totalPages = 0;
let currentPage = 0;

function injectContentScript(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ["content.js"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error injecting content script:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("Content script injected successfully");
        contentScriptInjected = true;
        chrome.tabs.sendMessage(
          tabId,
          { action: "contentScriptReady" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending contentScriptReady message:",
                chrome.runtime.lastError.message
              );
            } else {
              console.log("contentScriptReady message sent successfully");
            }
          }
        );
      }
    }
  );
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.startsWith("https://scholar.google.com/")) {
    injectContentScript(tab.id);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.startsWith("https://scholar.google.com/")
  ) {
    injectContentScript(tabId);
  }
});

function extractNextPage(tabId, sendResponse) {
  chrome.tabs.sendMessage(tabId, { action: "extractArticles" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "Error sending message to content script:",
        chrome.runtime.lastError.message
      );
      isExtracting = false;
      sendResponse({ error: chrome.runtime.lastError.message });
    } else if (response && response.articleInfo) {
      currentArticles = currentArticles.concat(response.articleInfo);
      currentPage++;

      console.log(`Extracted page ${currentPage} of ${totalPages}`);
      console.log(`Total articles so far: ${currentArticles.length}`);

      if (response.nextPageUrl && currentPage < totalPages) {
        console.log(`Navigating to next page: ${response.nextPageUrl}`);
        chrome.tabs.update(tabId, { url: response.nextPageUrl }, () => {
          setTimeout(() => extractNextPage(tabId, sendResponse), 3000); // Increased delay to 3 seconds
        });
      } else {
        console.log(
          `Extraction complete. Total pages: ${currentPage}, Total articles: ${currentArticles.length}`
        );
        isExtracting = false;
        sendResponse({ articleInfo: currentArticles, totalPages: currentPage });
      }
    } else {
      console.error("Unexpected response from content script:", response);
      isExtracting = false;
      sendResponse({ error: "Unexpected response from content script" });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "updateArticles") {
    currentArticles = request.articleInfo;
    console.log("Articles updated:", currentArticles);
  } else if (request.action === "getArticles") {
    console.log("Sending articles:", currentArticles);
    sendResponse({ articleInfo: currentArticles });
  } else if (request.action === "extractArticles") {
    if (isExtracting) {
      sendResponse({ error: "Extraction already in progress" });
      return true;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.startsWith("https://scholar.google.com/")) {
        isExtracting = true;
        currentArticles = [];
        currentPage = 0;
        totalPages = request.pages || 1;
        console.log(`Starting extraction for ${totalPages} pages`);
        extractNextPage(tabs[0].id, sendResponse);
      } else {
        sendResponse({ error: "No active Google Scholar tab found" });
      }
    });
    return true;
  } else if (request.action === "checkContentScript") {
    sendResponse({ injected: contentScriptInjected });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: "https://scholar.google.com/*" }, (tabs) => {
    for (const tab of tabs) {
      injectContentScript(tab.id);
    }
  });
});
