import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BlockstackCfgComponent} from './blockstack-cfg/blockstack-cfg.component';
import {BlockstackService} from './blockstack.service';
import {UiModule} from '../../ui/ui.module';
import {FormsModule} from '@angular/forms';


@NgModule({
  declarations: [BlockstackCfgComponent],
  exports: [BlockstackCfgComponent],
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
  ]
})
export class BlockstackModule {
  constructor(private _blockstackService: BlockstackService) {
  }
}
