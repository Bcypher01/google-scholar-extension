console.log("Content script loaded");

function extractArticleInfo() {
  const articleElements = document.querySelectorAll(".gs_r.gs_or.gs_scl");
  const articleInfo = Array.from(articleElements)
    .map((element) => {
      const titleElement = element.querySelector(".gs_rt");
      const authorElement = element.querySelector(".gs_a");
      return {
        title: titleElement ? titleElement.textContent.trim() : null,
        authors: authorElement
          ? authorElement.textContent.split("-")[0].trim()
          : null,
      };
    })
    .filter((info) => info.title && info.authors);

  console.log("Extracted article info:", articleInfo);
  return articleInfo;
}

function getNextPageUrl() {
  const nextButton = document.querySelector(".gs_btnPR");
  return nextButton ? nextButton.href : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  if (request.action === "extractArticles") {
    const articleInfo = extractArticleInfo();
    const nextPageUrl = getNextPageUrl();
    console.log("Sending response:", { articleInfo, nextPageUrl });
    sendResponse({ articleInfo, nextPageUrl });
  } else if (request.action === "contentScriptReady") {
    console.log("Content script is ready");
    sendResponse({ status: "ready" });
  }
  return true; // Indicates that the response is sent asynchronously
});

// Notify background script that content script is loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(
      "Error sending contentScriptLoaded message:",
      chrome.runtime.lastError.message
    );
  } else {
    console.log("contentScriptLoaded message sent successfully");
  }
});

console.log("Content script setup complete");
