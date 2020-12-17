import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'calendar-page',
  templateUrl: './calendar-page.component.html',
  styleUrls: ['./calendar-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarPageComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

}
