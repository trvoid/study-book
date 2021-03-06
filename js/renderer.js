////////////////////////////////////////////////////////////////////////////////
// Modules                                                                    //
////////////////////////////////////////////////////////////////////////////////
const {remote} = require('electron');
const jsonfile = require('jsonfile');
const path = require('path');
const dateformat = require('dateformat');
const fs = require('fs');

////////////////////////////////////////////////////////////////////////////////
// Constants                                                                  //
////////////////////////////////////////////////////////////////////////////////
const TNOTE_FILE_BASE_DIR = '.tbook'
const TNOTE_FILE_EXTENSION = 'tnote';

const JSONFILE_OPTIONS = {spaces:2, EOL:'\r\n'};

const NOTE_EXPLORER_PANEL = 1;
const NOTE_MEMO_PANEL = 2;
const NOTE_INFO_PANEL = 3;

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
    navHighlight = ById('nav-highlight');
    navMinimizeNote = ById('nav-minimize-note'),
    view = ById('view'),
    studyArea = ById('study-area'),
    studyAreaHeader = ById('study-area-header'),
    studyAreaBody = ById('study-area-body'),
    studyAreaFooter = ById('study-area-footer'),
    studyExplorerPanel = ById('study-explorer-panel'),
    studyMemoPanel = ById('study-memo-panel'),
    studyInfoPanel = ById('study-info-panel'),
    studyMemo = ById('study-memo'),
    switchExplorer = ById('switch-explorer'),
    switchMemo = ById('switch-memo'),
    switchHighlight = ById('switch-highlight'),
    switchInfo = ById('switch-info'),
    createNoteButton = ById('create-note-button'),
    studyMemoMde = new SimpleMDE({element: studyMemo, spellChecker: false, status: false});

let studyNoteFilePath;
let studyNoteObj;
let studyNoteSaveTimer;

////////////////////////////////////////////////////////////////////////////////
// Functions                                                                  //
////////////////////////////////////////////////////////////////////////////////
function getNewStudyNoteFilePath() {
    let baseDir = `./${TNOTE_FILE_BASE_DIR}`;

    let now = new Date();
    let yearStr = dateformat(now, 'yyyy');
    let monthStr = dateformat(now, 'mm');
    let datetimeStr = dateformat(now, 'yymmdd_hhMMss_l');

    return `${baseDir}/${yearStr}/${monthStr}/${datetimeStr}.${TNOTE_FILE_EXTENSION}`;
}

function showNoteExplorer() {
    ById('note-tree').innerHTML = '';

    let baseDir = `./${TNOTE_FILE_BASE_DIR}`;
    let root = { name: 'root', children: [] };

    fs.readdirSync(baseDir).forEach(year => {
        let yearDir = { name: year, children: [] };
        fs.readdirSync(`${baseDir}/${year}`).forEach(month => {
            let monthDir = { name: month, children: [] };
            fs.readdirSync(`${baseDir}/${year}/${month}`).forEach(noteFile => {
                let noteFileObj = { name: noteFile, children: [], path: `${year}/${month}/${noteFile}` };
                monthDir.children.push(noteFileObj);
            });
            yearDir.children.push(monthDir);
        });
        root.children.push(yearDir);
    });

    const tree = require('electron-tree-view')({
        root,
        container: document.querySelector('#note-tree'),
        children: c => c.children,
        label: c => c.name
    })

    tree.on('selected', item => {
        if (!item.name.endsWith(TNOTE_FILE_EXTENSION)) {
            return;
        }
        let filePath = `${TNOTE_FILE_BASE_DIR}/${item.path}`;
        openStudyNote(filePath);
    });
}

function createStudyNote(event) {
    document.getElementById('new-note-dialog').style.display = 'block';
}

function setHighlight(highlight) {
    view.send('highlight-on', {
        id: 'myElementID',
        text: 'browser',
        color: '#eeeb3b',
        selectionRange: highlight.selectionRange
    });
}

function loadStudyNote(filePath) {
    studyNoteFilePath = filePath;

    jsonfile.readFile(studyNoteFilePath, function(err, obj) {
        if (err) {
            console.error(err);
            return;
        }

        studyNoteObj = obj;
        let title = obj.title;
        let link = obj.material.link;
        let study = obj.study;
        if (study.memo === undefined) {
            study.memo = {
                'created-when': '',
                'modified-when': '',
                'content': 'Put your memo here.',
            };
        }
        if (study.highlights === undefined) {
            study.highlights = [];
        }

        document.getElementById('file-name').innerHTML = path.basename(studyNoteFilePath, '.snote');
        document.getElementById('file-value').innerHTML = studyNoteFilePath;
        document.getElementById('url-value').innerHTML = link;
        document.getElementById('title-value').innerHTML = title;

        view.loadURL(link);
        if (study.memo !== undefined) {
            studyMemoMde.value(study.memo.content);

            studyMemoMde.codemirror.on("change", function() {
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

function openStudyNote(filePath) {
    studyAreaBody.style.display = 'none';
    studyAreaFooter.style.display = 'none';

    if (studyNoteSaveTimer !== undefined) {
        clearTimeout(studyNoteSaveTimer);
        studyNoteSaveTimer = undefined;
        saveStudyNote();
    }
    studyMemoMde.codemirror.on('change', function() {});
    studyMemoMde.value('');

    loadStudyNote(filePath);
}

function saveStudyNote() {
    if (studyNoteFilePath === undefined) {
        return;
    }

    studyNoteObj.study.memo.content = studyMemoMde.value();

    let fileDir = path.dirname(studyNoteFilePath);
    if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
    }

    jsonfile.writeFileSync(studyNoteFilePath, studyNoteObj, JSONFILE_OPTIONS);
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

function switchTo(panel) {
    studyExplorerPanel.style.display = 'none';
    studyMemoPanel.style.display = 'none';
    studyInfoPanel.style.display = 'none';

    document.getElementById('switch-explorer').classList.remove('w3-text-teal');
    document.getElementById('switch-memo').classList.remove('w3-text-teal');
    document.getElementById('switch-info').classList.remove('w3-text-teal');

    switch (panel) {
        case NOTE_EXPLORER_PANEL:
            studyExplorerPanel.style.display = 'block';
            document.getElementById('switch-explorer').classList.add('w3-text-teal');
            break;
        case NOTE_MEMO_PANEL:
            studyMemoPanel.style.display = 'block';
            document.getElementById('switch-memo').classList.add('w3-text-teal');
            break;
        case NOTE_INFO_PANEL:
            studyInfoPanel.style.display = 'block';
            document.getElementById('switch-info').classList.add('w3-text-teal');
            break;
        default:
            break;
    }
}

////////////////////////////////////////////////////////////////////////////////
// Main                                                                       //
////////////////////////////////////////////////////////////////////////////////
view.addEventListener('dom-ready', () => {
    //view.openDevTools();

    if (studyNoteObj !== undefined) {
        studyNoteObj.study.highlights.forEach(setHighlight);
    }
});

view.addEventListener('ipc-message', function(event) {
    console.log(event);

    let channelObj = JSON.parse(event.channel);
    if ('selectionRange' in channelObj && channelObj.selectionRange !== null) {
        view.send('highlight-on', {
            id: 'myElementID',
            text: 'browser',
            color: '#eeeb3b',
            selectionRange: channelObj.selectionRange
        });

        let highlight = {
            'created-when': dateformat(new Date(), 'yyyy-mm-dd hh:MM:ss'),
            selectionRange: channelObj.selectionRange
        };
        if (studyNoteObj.highlights === undefined) {
            studyNoteObj.study.highlights = [];
        }
        studyNoteObj.study.highlights.push(highlight);

        saveStudyNote();
    }
});

navNewNote.addEventListener('click', createStudyNote);
navHighlight.addEventListener('click', function() {
    view.send('get-selection-range');
});
navMinimizeNote.addEventListener('click', minimizeStudyNote);

switchExplorer.addEventListener('click', function() {
    switchTo(NOTE_EXPLORER_PANEL);
});

switchMemo.addEventListener('click', function() {
    switchTo(NOTE_MEMO_PANEL);
});

switchInfo.addEventListener('click', function() {
    switchTo(NOTE_INFO_PANEL);
});

createNoteButton.addEventListener('click', function() {
    var url = document.getElementById('note-url').value;
    var title = document.getElementById('note-title').value;

    document.getElementById('new-note-dialog').style.display = 'none';

    studyAreaBody.style.display = 'none';
    studyAreaFooter.style.display = 'none';

    if (studyNoteSaveTimer !== undefined) {
        clearTimeout(studyNoteSaveTimer);
        studyNoteSaveTimer = undefined;
        saveStudyNote();
    }
    studyMemoMde.codemirror.on('change', function() {});
    studyMemoMde.value('');

    var newNoteObj = {
        'title': title,
        'material': {
            'type': 'web',
            'link': url
        },
        'study': {
            'memo': {
                'created-when': '',
                'modified-when': '',
                'content': ''
            }
        }
    };

    var filePath = getNewStudyNoteFilePath();

    studyNoteFilePath = filePath;
    studyNoteObj = newNoteObj;
    saveStudyNote();

    loadStudyNote(filePath);
});

dragElement(document.getElementById('study-area'));

showNoteExplorer();
switchTo(NOTE_EXPLORER_PANEL);
