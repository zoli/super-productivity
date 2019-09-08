// import {ipcRenderer} from 'electron';


const btns = document.querySelectorAll('.tabs button');
const modeFn = [];
let currentMode;

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

function response() {
  // ipcRenderer.send('closeDialog', document.getElementById('inp').value);
  this.close();
}


document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.altKey) && [1, 2, 3, 4].includes(+ev.key)) {
    modeFn[+ev.key - 1]();
  }
});


window.onload = () => {
  // var options = ipcRenderer.sendSync("openDialog", "")
  // var params = JSON.parse(options)

  const inp = document.getElementById('inp');
  modeFn[0]();
  inp.focus();
};
