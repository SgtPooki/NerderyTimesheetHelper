chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.method == 'getLocalStorage')
      sendResponse(localStorage[request.key]);
    else
      sendResponse(null);
});