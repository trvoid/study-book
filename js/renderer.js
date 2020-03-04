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
    studyQuizPanel = ById('study-quiz-panel'),
    studyPropertiesPanel = ById('study-properties-panel'),
    studyMemo = ById('study-memo'),
    studyQuiz = ById('study-quiz'),
    switchMemo = ById('switch-memo'),
    switchQuiz = ById('switch-quiz'),
    switchHighlight = ById('switch-highlight'),
    switchProperties = ById('switch-properties'),
    createNoteButton = ById('create-note-button'),
    studyMemoMde = new SimpleMDE({element: studyMemo, spellChecker: false, status: false}),
    studyQuizMde = new SimpleMDE({element: studyQuiz, spellChecker: false, status: false});

let studyNoteFilePath;
let studyNoteObj;
let studyNoteSaveTimer;

////////////////////////////////////////////////////////////////////////////////
// Functions                                                                  //
////////////////////////////////////////////////////////////////////////////////
function getNewStudyNoteFilePath() {
    let baseDir = `./${TNOTE_FILE_BASE_DIR}`;

    let now = new Date();
    let monthStr = dateformat(now, 'yyyy-mm');
    let datetimeStr = dateformat(now, 'yymmdd_hhMMss_l');

    return `${baseDir}/${monthStr}/${datetimeStr}.${TNOTE_FILE_EXTENSION}`;
}

function showNoteExplorer(event) {
    ById('note-tree').innerHTML = '';

    let baseDir = `./${TNOTE_FILE_BASE_DIR}`;
    let root = { name: 'root', children: [] };

    fs.readdirSync(baseDir).forEach(file => {
        let monthDir = { name: file, children: [] };
        fs.readdirSync(`${baseDir}/${file}`).forEach(noteFile => {
            let noteFileObj = { name: noteFile, children: [] };
            monthDir.children.push(noteFileObj);
        });
        root.children.push(monthDir);
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
        let fileDir = '2020-03';
        let filePath = `${TNOTE_FILE_BASE_DIR}/${fileDir}/${item.name}`;
        openStudyNote(filePath);
    })

    document.getElementById('note-explorer').style.display = 'block';
}

function createStudyNote(event) {
    document.getElementById('new-note-dialog').style.display = 'block';
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
                'content': '',
            };
        }
        if (study.quiz === undefined) {
            study.quiz = {
                'created-when': '',
                'modified-when': '',
                'content': '',
            };
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
        if (study.quiz !== undefined) {
            studyQuizMde.value(study.quiz.content);

            studyQuizMde.codemirror.on("change", function() {
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
    studyQuizMde.codemirror.on('change', function() {});
    studyQuizMde.value('');

    loadStudyNote(filePath);
}

function saveStudyNote() {
    studyNoteObj.study.memo.content = studyMemoMde.value();
    studyNoteObj.study.quiz.content = studyQuizMde.value();

    let fileDir = path.dirname(studyNoteFilePath);
    if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
    }

    jsonfile.writeFile(studyNoteFilePath, studyNoteObj, JSONFILE_OPTIONS, function(err) {
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

    let channelObj = JSON.parse(event.channel);
    if ('selectionRange' in channelObj && channelObj.selectionRange !== null) {
        view.send('highlight-on', {
            id: 'myElementID',
            text: 'browser',
            color: 'red',
            selectionRange: channelObj.selectionRange
        });
    }
});

navNewNote.addEventListener('click', createStudyNote);
navOpenNote.addEventListener('click', showNoteExplorer);
navMinimizeNote.addEventListener('click', minimizeStudyNote);
navMinimizeNote.addEventListener('mouseover', function() {
    studyArea.style.opacity = 0.10;
});
navMinimizeNote.addEventListener('mouseout', function() {
    studyArea.style.opacity = 0.96;
});

switchMemo.addEventListener('click', function() {
    studyMemoPanel.style.display = 'block';
    studyQuizPanel.style.display = 'none';
    studyPropertiesPanel.style.display = 'none';

    document.getElementById('switch-memo').classList.remove('w3-text-teal');
    document.getElementById('switch-quiz').classList.remove('w3-text-teal');
    document.getElementById('switch-highlight').classList.remove('w3-text-teal');
    document.getElementById('switch-typing').classList.remove('w3-text-teal');
    document.getElementById('switch-properties').classList.remove('w3-text-teal');

    document.getElementById('switch-memo').classList.add('w3-text-teal');
});

switchQuiz.addEventListener('click', function() {
    studyMemoPanel.style.display = 'none';
    studyQuizPanel.style.display = 'block';
    studyPropertiesPanel.style.display = 'none';

    document.getElementById('switch-memo').classList.remove('w3-text-teal');
    document.getElementById('switch-quiz').classList.remove('w3-text-teal');
    document.getElementById('switch-highlight').classList.remove('w3-text-teal');
    document.getElementById('switch-typing').classList.remove('w3-text-teal');
    document.getElementById('switch-properties').classList.remove('w3-text-teal');

    document.getElementById('switch-quiz').classList.add('w3-text-teal');
});

switchHighlight.addEventListener('click', function() {
    view.send('get-selection-range');

    document.getElementById('switch-memo').classList.remove('w3-text-teal');
    document.getElementById('switch-quiz').classList.remove('w3-text-teal');
    document.getElementById('switch-highlight').classList.remove('w3-text-teal');
    document.getElementById('switch-typing').classList.remove('w3-text-teal');
    document.getElementById('switch-properties').classList.remove('w3-text-teal');

    document.getElementById('switch-highlight').classList.add('w3-text-teal');
});

switchProperties.addEventListener('click', function() {
    view.send('highlight-on', {
        id: 'myelementID',
        text: 'browser',
        startContainerPath: '//*[@id="main"][1]/div/div/p/text()',
        startOffset: 6,
        endContainerPath: '//*[@id="main"][1]/div/div/p/text()',
        endOffset: 11
    });

    studyMemoPanel.style.display = 'none';
    studyQuizPanel.style.display = 'none';
    studyPropertiesPanel.style.display = 'block';

    document.getElementById('switch-memo').classList.remove('w3-text-teal');
    document.getElementById('switch-quiz').classList.remove('w3-text-teal');
    document.getElementById('switch-highlight').classList.remove('w3-text-teal');
    document.getElementById('switch-typing').classList.remove('w3-text-teal');
    document.getElementById('switch-properties').classList.remove('w3-text-teal');

    document.getElementById('switch-properties').classList.add('w3-text-teal');
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
    studyQuizMde.codemirror.on('change', function() {});
    studyQuizMde.value('');

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
            },
            'quiz': {
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

studyAreaBody.style.display = 'none';
studyAreaFooter.style.display = 'none';
studyQuizPanel.style.display = 'none';
studyPropertiesPanel.style.display = 'none';

dragElement(document.getElementById('study-area'));
