import { Component } from '@angular/core';
import { GameComponent } from './game/game.component';
import { HudComponent } from './hud/hud.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent, HudComponent],
  template: `
    <div class="game-shell">
      <app-game />
      <app-hud />
    </div>
  `,
  styles: [`
    .game-shell {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    app-hud {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
  `],
})
export class App {}
