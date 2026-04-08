import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LevelPayload, Upgrade } from '../bridge/game-events';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upgrade-modal.component.html',
  styleUrl: './upgrade-modal.component.css',
})
export class UpgradeModalComponent {
  @Input() data!: LevelPayload;
  @Output() chosen = new EventEmitter<string>();

  select(u: Upgrade) { this.chosen.emit(u.id); }
}
