import {ipcRenderer} from 'electron';
import {AwesomeAddTaskPayload, IPC} from '../ipc-events.const';

const LS_KEY = 'SP_TMP_INP';

const btns = document.querySelectorAll('.tabs button');
const modeFn = [];
let currentMode;
const inp = document.getElementById('inp') as HTMLInputElement;

Array.from(btns).forEach((btn, i) => addMode(btn, i));


function addMode(btn, i) {
  modeFn[i] = () => {
    currentMode = i;
    removeActive();
    btn.classList.add('active');
  };
  btn.addEventListener('click', modeFn[i]);
}

function removeActive() {
  Array.from(btns).forEach(btn => btn.classList.remove('active'));
}

document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.altKey) && [1, 2, 3, 4].includes(+ev.key)) {
    modeFn[+ev.key - 1]();
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
        projectId: null
      } as AwesomeAddTaskPayload);
      break;
    case 1:
      ipcRenderer.send(IPC.AWE_ADD_SUB_TASK, {
        title,
        projectId: null
      } as AwesomeAddTaskPayload);
      break;
    case 2:
      // TODO selection
    case 3:
      ipcRenderer.send(IPC.AWE_ADD_NOTE, {
        title,
        projectId: null
      } as AwesomeAddTaskPayload);
      break;
  }

}

window.onload = () => {
  // var options = ipcRenderer.sendSync("openDialog", "")
  // var params = JSON.parse(options)

  console.log(localStorage.getItem(LS_KEY));

  inp.value = localStorage.getItem(LS_KEY) || '';

  modeFn[0]();
  inp.focus();
};
