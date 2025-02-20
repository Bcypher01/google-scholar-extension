document.addEventListener("DOMContentLoaded", () => {
  const extractButton = document.getElementById("extractButton");
  const statusDiv = document.getElementById("status");
  const articleListDiv = document.getElementById("articleList");
  const pagesInput = document.getElementById("pagesInput");

  function updateUI(articles, totalPages) {
    if (articles.length > 0) {
      statusDiv.textContent = `${articles.length} articles found from ${totalPages} page(s)`;
      articleListDiv.innerHTML =
        "<h3>Extracted Articles:</h3>" +
        articles
          .map(
            (article) => `
          <div class="article">
            <h3>${article.title}</h3>
            <p>${article.authors}</p>
          </div>
        `
          )
          .join("");
    } else {
      statusDiv.textContent =
        "No articles found. Make sure you are on a Google Scholar search results page.";
      articleListDiv.innerHTML = "";
    }
  }

  function checkContentScriptAndExtract() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.startsWith("https://scholar.google.com/")) {
        chrome.runtime.sendMessage(
          { action: "checkContentScript" },
          (response) => {
            if (chrome.runtime.lastError) {
              statusDiv.textContent =
                "Error: " + chrome.runtime.lastError.message;
            } else if (response && response.injected) {
              extractArticles();
            } else {
              statusDiv.textContent =
                "Please refresh the Google Scholar page and try again.";
            }
          }
        );
      } else {
        statusDiv.textContent =
          "Please navigate to a Google Scholar page and try again.";
      }
    });
  }

  function extractArticles() {
    const pages = Number.parseInt(pagesInput.value) || 1;
    statusDiv.textContent = "Extracting articles...";
    chrome.runtime.sendMessage(
      { action: "extractArticles", pages: pages },
      (response) => {
        console.log("Received response:", response);
        if (chrome.runtime.lastError) {
          statusDiv.textContent = "Error: " + chrome.runtime.lastError.message;
        } else if (response.error) {
          statusDiv.textContent = "Error: " + response.error;
        } else if (response.articleInfo) {
          updateUI(response.articleInfo, response.totalPages);
        } else {
          statusDiv.textContent = "No articles found. Try refreshing the page.";
        }
      }
    );
  }

  extractButton.addEventListener("click", checkContentScriptAndExtract);

  // Try to get articles immediately when popup opens
  chrome.runtime.sendMessage({ action: "getArticles" }, (response) => {
    console.log("Initial getArticles response:", response);
    if (chrome.runtime.lastError) {
      statusDiv.textContent = "Error: " + chrome.runtime.lastError.message;
    } else if (response && response.articleInfo) {
      updateUI(response.articleInfo, 1);
    } else {
      statusDiv.textContent = "Click the button to extract articles.";
    }
  });
});
