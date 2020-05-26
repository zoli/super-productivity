import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BlockstackService} from '../blockstack.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {T} from 'src/app/t.const';

@Component({
  selector: 'blockstack-cfg',
  templateUrl: './blockstack-cfg.component.html',
  styleUrls: ['./blockstack-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockstackCfgComponent {
  T = T;

  cfg = {};

  constructor(
    private _blockstackService: BlockstackService,
    private _globalConfigService: GlobalConfigService,
  ) {
  }


  signIn() {
    this._blockstackService.signIn();
  }


  toggleEnabled(isEnabled: boolean) {
    this._globalConfigService.updateSection('blockstackSync', {
      isEnabled,
    });
  }
}
