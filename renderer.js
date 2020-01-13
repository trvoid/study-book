////////////////////////////////////////////////////////////////////////////////
// Modules                                                                    //
////////////////////////////////////////////////////////////////////////////////
const {remote} = require('electron');
const jsonfile = require('jsonfile');
const path = require('path');

////////////////////////////////////////////////////////////////////////////////
// Constants                                                                  //
////////////////////////////////////////////////////////////////////////////////
const SNOTE_FILE_EXTENSION = '.snote';

////////////////////////////////////////////////////////////////////////////////
// Utilities                                                                  //
////////////////////////////////////////////////////////////////////////////////
var ById = function(id) {
    return document.getElementById(id);
}

////////////////////////////////////////////////////////////////////////////////
// Variables                                                                  //
////////////////////////////////////////////////////////////////////////////////
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();

const materialArea = ById('material-area'),
    navMenu = ById('nav-menu'),
    navOpen = ById('nav-open'),
    view = ById('view'),
    studyArea = ById('study-area'),
    studyNote = ById('study-note'),
    studyMemo = ById('study-memo'),
    switchMemo = ById('switch-memo'),
    switchHighlight = ById('switch-highlight'),
    studyMde = new SimpleMDE({element: studyMemo});

let studyNoteFilePath;
let studyNoteObj;
let studyNoteSaveTimer;

////////////////////////////////////////////////////////////////////////////////
// Functions                                                                  //
////////////////////////////////////////////////////////////////////////////////
function openStudyNote(event) {
    let options = {
        title : 'Open a study note',
        defaultPath : '.',
        buttonLabel : 'Open',
        filters : [
            {name: 'Study notes', extensions: ['snote']}
        ],
        properties: ['openFile']
    };

    let filePaths = dialog.showOpenDialogSync(mainWindow, options);

    if (filePaths === undefined) {
        return;
    }

    studyArea.style.display = 'none';

    if (studyNoteSaveTimer !== undefined) {
        clearTimeout(studyNoteSaveTimer);
        studyNoteSaveTimer = undefined;
        saveStudyNote();
    }
    studyMde.codemirror.on('change', function() {});
    studyMde.value('');

    studyNoteFilePath = filePaths[0];
    jsonfile.readFile(studyNoteFilePath, function(err, obj) {
        if (err) {
            console.error(err);
            return;
        }

        studyNoteObj = obj;
        let title = obj.title;
        let link = obj.material.link;
        let study = obj.study;
        view.loadURL(link);
        if (study.memo !== undefined) {
            studyMde.value(study.memo.content);

            studyMde.codemirror.on("change", function() {
                if (studyNoteSaveTimer !== undefined) {
                    clearTimeout(studyNoteSaveTimer);
                }
            	studyNoteSaveTimer = setTimeout(saveStudyNote, 5000);
            });
        }
    });

    studyArea.style.display = 'block';
}

function saveStudyNote() {
    studyNoteObj.study.memo.content = studyMde.value();
    let options = {spaces:2, EOL:'\r\n'};
    jsonfile.writeFile(studyNoteFilePath, studyNoteObj, options, function(err) {
        if (err) console.error(err);
    });
}

function dragElement(elem) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elem.id + 'header')) {
        document.getElementById(elem.id + 'header').onmousedown = dragMouseDown;
    } else {
        elem.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        elem.style.top = (elem.offsetTop - pos2) + 'px';
        elem.style.left = (elem.offsetLeft - pos1) + 'px';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

////////////////////////////////////////////////////////////////////////////////
// Main                                                                       //
////////////////////////////////////////////////////////////////////////////////
view.addEventListener('dom-ready', () => {
    view.openDevTools();
});

view.addEventListener('ipc-message', function(event) {
    console.log(event);
    console.info(event.channel);
});

navOpen.addEventListener('click', openStudyNote);

switchMemo.addEventListener('click', function() {
    if (studyArea.style.display === 'none') {
        studyArea.style.display = 'block';
    } else {
        studyArea.style.display = 'none';
    }
});

switchHighlight.addEventListener('click', function() {
    //view.send('request');
    view.send('highlight-on', {
        id: 'myelementID',
        text: 'My text'
    });
});

studyArea.style.display = 'none';

dragElement(document.getElementById('study-area'));
