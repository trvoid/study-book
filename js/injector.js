////////////////////////////////////////////////////////////////////////////////
// Modules                                                                    //
////////////////////////////////////////////////////////////////////////////////
const {ipcRenderer} = require('electron');
const xpath = require('./xpath.js');

ipcRenderer.on('get-selection-range', function() {
    let returnObj = { selectionRange: null };

    let selection = window.getSelection();
    if (selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        let xpathRange = xpath.createXPathRangeFromRange(range);
        returnObj.selectionRange = xpathRange;
    }

    ipcRenderer.sendToHost(JSON.stringify(returnObj));
});

ipcRenderer.on('highlight-on', function(event, data){
    let range = xpath.createRangeFromXPathRange(data.selectionRange);
    let elem = document.createElement('span');
    elem.style.backgroundColor = data.color;
    range.surroundContents(elem);
});
