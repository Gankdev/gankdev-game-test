import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import Phaser from 'phaser';
import { GAME_CONFIG } from './phaser/game.config';
import { GameBridgeService } from '../bridge/game-bridge.service';

@Component({
  selector: 'app-game',
  template: '<div id="phaser-game" class="w-full h-full"></div>',
  styles: [':host { display: block; width: 100%; height: 100%; }'],
})
export class GameComponent implements AfterViewInit, OnDestroy {
  private game?: Phaser.Game;
  private bridge = inject(GameBridgeService);

  ngAfterViewInit() {
    this.game = new Phaser.Game({
      ...GAME_CONFIG,
      callbacks: {
        preBoot: (game) => {
          game.registry.set('bridge', this.bridge);
        },
      },
    });
  }

  ngOnDestroy() {
    this.game?.destroy(true);
  }
}
