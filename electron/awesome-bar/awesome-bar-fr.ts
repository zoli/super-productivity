import {ipcRenderer} from 'electron';
import {IPC} from '../ipc-events.const';

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
    ipcRenderer.send(IPC.AWE_ADD_TASK, {
      value: inp.value,
      projectId: ''
    });
    inp.value = '';
  } else {
    localStorage.setItem(LS_KEY, inp.value);
  }
});


window.onload = () => {
  // var options = ipcRenderer.sendSync("openDialog", "")
  // var params = JSON.parse(options)

  console.log(localStorage.getItem(LS_KEY));

  inp.value = localStorage.getItem(LS_KEY) || '';

  modeFn[0]();
  inp.focus();
};
