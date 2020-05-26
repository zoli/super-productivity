import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BlockstackService} from '../blockstack.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {T} from 'src/app/t.const';
import {map} from 'rxjs/operators';

@Component({
  selector: 'blockstack-cfg',
  templateUrl: './blockstack-cfg.component.html',
  styleUrls: ['./blockstack-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockstackCfgComponent {
  T = T;

  constructor(
    public blockstackService: BlockstackService,
    public globalConfigService: GlobalConfigService,
  ) {
  }


  signIn() {
    this.blockstackService.signIn();
  }

  signOut() {
    this.blockstackService.signOut();
  }


  toggleEnabled(isEnabled: boolean) {
    this.globalConfigService.updateSection('blockstackSync', {
      isEnabled,
    });
  }
}
