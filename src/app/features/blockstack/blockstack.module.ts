import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BlockstackCfgComponent} from './blockstack-cfg/blockstack-cfg.component';
import {BlockstackService} from './blockstack.service';


@NgModule({
  declarations: [BlockstackCfgComponent],
  exports: [BlockstackCfgComponent],
  imports: [
    CommonModule
  ]
})
export class BlockstackModule {
  constructor(private _blockstackService: BlockstackService) {
  }
}
