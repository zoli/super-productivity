import {ipcRenderer} from 'electron';
import {AwesomeAddTaskPayload, IPC} from '../ipc-events.const';
import {AwesomeBarDataTransfer} from './awesome-bar.model';

const LS_KEY = 'SP_TMP_INP';
let data: AwesomeBarDataTransfer;
const btns = document.querySelectorAll('.mode-btn');
const ctrlItems = [];
let currentMode;
let selectedProjectId;
const inp = document.getElementById('inp') as HTMLInputElement;
const projectSwitcher = document.getElementById('switch-project') as HTMLSelectElement;
const currentTaskTitleEl = document.getElementById('current-task-title');

Array.from(btns).forEach((btn, i) => addMode(btn, i));

function addMode(btn, i) {
  ctrlItems.push({
    enableMode: () => {
      currentMode = i;
      removeActive();
      btn.classList.add('active');
      switch (i) {
        case 0:
          inp.placeholder = 'Add Task';
          break;
        case 1:
          inp.placeholder = 'Add Sub Task to current task';
          break;
        case 2:
          inp.placeholder = 'Add Note';
          break;
        case 3:
          inp.placeholder = 'Select Task';
      }
    },
    show: () => {
      btn.style.display = '';
    },
    hide: () => {
      btn.style.display = 'none';
    }
  });
  btn.addEventListener('click', () => ctrlItems[i].enableMode());
}

function removeActive() {
  Array.from(btns).forEach(btn => btn.classList.remove('active'));
}


document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.altKey || ev.metaKey) && [1, 2, 3, 4].includes(+ev.key)) {
    ctrlItems[+ev.key - 1].enableMode();
    inp.focus();
  } else if ((ev.ctrlKey || ev.altKey) && [5].includes(+ev.key)) {
    projectSwitcher.focus();
  } else if (ev.key === 'Escape') {
    this.close();
  } else if (ev.key === 'Enter' && inp.value === '') {
    this.close();
  } else if (ev.key === 'Enter') {
    addItem(inp.value);
    inp.value = '';
    localStorage.setItem(LS_KEY, inp.value);
  } else {
    localStorage.setItem(LS_KEY, inp.value);
  }
});

function addItem(title) {
  console.log(currentMode);

  switch (currentMode) {
    case 0:
      ipcRenderer.send(IPC.AWE_ADD_TASK, {
        title,
        projectId: selectedProjectId
      } as AwesomeAddTaskPayload);
      break;
    case 1:
      ipcRenderer.send(IPC.AWE_ADD_SUB_TASK, {
        title,
        projectId: selectedProjectId
      } as AwesomeAddTaskPayload);
      break;
    case 2:
      ipcRenderer.send(IPC.AWE_ADD_NOTE, {
        title,
        projectId: selectedProjectId
      } as AwesomeAddTaskPayload);
      break;
    case 3:
    // TODO selection
  }

}

window.onload = () => {
  // var options = ipcRenderer.sendSync("openDialog", "")
  // var params = JSON.parse(options)
  inp.value = localStorage.getItem(LS_KEY) || '';

  ctrlItems[0].enableMode();
  inp.focus();
};

window.addEventListener('focus', (event) => {
  inp.focus();
}, false);

const root = document.documentElement;

ipcRenderer.on(IPC.AWE_SENT_DATA, (ev, d: AwesomeBarDataTransfer) => {
  root.style.setProperty('--mc', d.currentProject.theme.primary);
  root.style.setProperty('--ac', d.currentProject.theme.accent);
  data = d;
  if (projectSwitcher.options) {
    for (let i = 0; i < projectSwitcher.options.length; i++) {
      projectSwitcher.options.remove(i);
    }
  }
  projectSwitcher.options.length = 0;

  d.projectList.forEach((project, i) => {
    projectSwitcher.options[projectSwitcher.options.length] = new Option(project.title, project.id);
    if (project.id === d.currentProject.id) {
      projectSwitcher.selectedIndex = i;
    }
  });

  if (d.currentTask) {
    currentTaskTitleEl.innerText = d.currentTask.title;
    ctrlItems[1].show();
    if (currentMode === 0) {
      ctrlItems[1].enableMode();
    }
  } else {
    currentTaskTitleEl.innerText = 'none';
    ctrlItems[1].hide();
  }
});

projectSwitcher.onchange = (event) => {
  selectedProjectId = projectSwitcher.value;
  if (selectedProjectId === data.currentProject.id && data.currentTask) {
    ctrlItems[1].show();
  } else {
    ctrlItems[1].hide();
    if (currentMode === 1) {
      ctrlItems[0].enableMode();
    }
  }
  inp.focus();
};
