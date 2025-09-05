chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "index.html",
        enabled: true,
    });

    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
    })
    chrome.sidePanel.open({ tabId: tab.id });
});