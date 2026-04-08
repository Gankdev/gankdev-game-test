import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameOverPayload } from '../bridge/game-events';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-over.component.html',
  styleUrl: './game-over.component.css',
})
export class GameOverComponent {
  @Input() data!: GameOverPayload;
  @Output() restart = new EventEmitter<void>();

  get formattedTime() {
    const s = Math.floor(this.data.timeMs / 1000);
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }
}
