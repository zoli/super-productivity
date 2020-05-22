import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SolidExampleComponent} from './solid-example/solid-example.component';


@NgModule({
  declarations: [SolidExampleComponent],
  imports: [
    CommonModule
  ],
  exports: [SolidExampleComponent]
})
export class SolidModule {
}
