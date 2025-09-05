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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fetchData') {
        fetch('http://localhost:3000/api/processdata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.payload)
        })
            .then(res => res.json())
            .then(data => sendResponse(data))
            .catch(err => console.error(err));
        return true; // keep the message channel open
    }
});
