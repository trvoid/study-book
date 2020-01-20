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
    navNewNote = ById('nav-new-note'),
    navOpenNote = ById('nav-open-note'),
    navMinimizeNote = ById('nav-minimize-note'),
    view = ById('view'),
    studyArea = ById('study-area'),
    studyAreaHeader = ById('study-area-header'),
    studyAreaBody = ById('study-area-body'),
    studyAreaFooter = ById('study-area-footer'),
    studyMemoPanel = ById('study-memo-panel'),
    studyPropertiesPanel = ById('study-properties-panel'),
    studyMemo = ById('study-memo'),
    switchMemo = ById('switch-memo'),
    switchHighlight = ById('switch-highlight'),
    switchProperties = ById('switch-properties'),
    studyMde = new SimpleMDE({element: studyMemo});

let studyNoteFilePath;
let studyNoteObj;
let studyNoteSaveTimer;

////////////////////////////////////////////////////////////////////////////////
// Functions                                                                  //
////////////////////////////////////////////////////////////////////////////////
function createStudyNote(event) {

}

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

    studyAreaBody.style.display = 'none';
    studyAreaFooter.style.display = 'none';

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

    studyArea.style.height = '440px';
    studyAreaBody.style.display = 'block';
    studyAreaFooter.style.display = 'block';
}

function saveStudyNote() {
    studyNoteObj.study.memo.content = studyMde.value();
    let options = {spaces:2, EOL:'\r\n'};
    jsonfile.writeFile(studyNoteFilePath, studyNoteObj, options, function(err) {
        if (err) console.error(err);
    });
}

function minimizeStudyNote(event) {
    if (studyArea.style.height === '42px') {
        studyArea.style.height = '440px';
        studyAreaBody.style.display = 'block';
        studyAreaFooter.style.display = 'block';
    } else {
        studyArea.style.height = '42px';
        studyAreaBody.style.display = 'none';
        studyAreaFooter.style.display = 'none';
    }
}

function dragElement(elem) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elem.id + '-header')) {
        document.getElementById(elem.id + '-header').onmousedown = dragMouseDown;
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

navNewNote.addEventListener('click', createStudyNote);
navOpenNote.addEventListener('click', openStudyNote);
navMinimizeNote.addEventListener('click', minimizeStudyNote);

switchMemo.addEventListener('click', function() {
    studyMemoPanel.style.display = 'block';
    studyPropertiesPanel.style.display = 'none';
});

switchHighlight.addEventListener('click', function() {
    //view.send('request');
    view.send('highlight-on', {
        id: 'myelementID',
        text: 'browser',
        startContainerPath: 'p[3]',
        startOffset: 3,
        endContainerPath: 'p[3]',
        endOffset: 6
    });
});

switchProperties.addEventListener('click', function() {
    studyMemoPanel.style.display = 'none';
    studyPropertiesPanel.style.display = 'block';
});

studyAreaBody.style.display = 'none';
studyAreaFooter.style.display = 'none';

dragElement(document.getElementById('study-area'));
