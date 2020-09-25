import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { IS_ANDROID_WEB_VIEW } from './app/util/is-android-web-view';
import { androidInterface } from './app/core/android/android-interface';

if (environment.production || environment.stage) {
  enableProdMode();
}
// if ('serviceWorker' in navigator) {
//   console.log('REGISTER SERVICE WORKER');
//
//   // navigator.serviceWorker.register('testsw.js')
//   //   .then((xx) => console.log('DONEd', xx))
//   //   .catch((xx) => console.error('FAILEDd', xx));
//
//   setTimeout(() => {
//     navigator.serviceWorker.register('ngsw-worker.js')
//       .then((xx) => console.log('DONEd', xx))
//       .catch((xx) => console.error('FAILEDd', xx));
//
//   }, 4000);
//
//
//   // navigator.serviceWorker.register('file:///home/johannes/www/super-productivity/dist/ngsw-worker.js')
//   //   .then((xx) => console.log('DONE', xx))
//   //   .catch((xx) => console.error('FAILED', xx));
// }

platformBrowserDynamic().bootstrapModule(AppModule).then(() => {
  // TODO make asset caching work for electron
  // if ('serviceWorker' in navigator && (environment.production || environment.stage) && !IS_ELECTRON) {
  if ('serviceWorker' in navigator && (environment.production || environment.stage)) {
    console.log('Registering Service worker');
    return navigator.serviceWorker.register('ngsw-worker.js');
  }
  return;
}).catch(err => {
  console.log('Service Worker Registration Error');
  console.log(err);
});

// fix mobile scrolling while dragging
window.addEventListener('touchmove', () => {
});

if (!(environment.production || environment.stage) && IS_ANDROID_WEB_VIEW) {
  setTimeout(() => {
    androidInterface.showToast('Android DEV works');
    console.log(androidInterface);
  }, 1000);
}
