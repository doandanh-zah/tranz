chrome.action.onClicked.addListener(tab=>{if(tab.id)void chrome.sidePanel.open({tabId:tab.id});});
