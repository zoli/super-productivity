import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {SolidService} from '../solid.service';

@Component({
  selector: 'solid-example',
  templateUrl: './solid-example.component.html',
  styleUrls: ['./solid-example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SolidExampleComponent implements OnInit {

  constructor(
    private _solidService: SolidService,
  ) { }

  ngOnInit() {
  }


  signIn(){
    this._solidService.signIn();
  }
}
