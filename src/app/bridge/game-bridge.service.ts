import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  HpPayload, LevelPayload, GameOverPayload, WeaponPayload,
  XpPayload, ElitePayload, UpgradeId, WeaponType
} from './game-events';

/** Engine → UI */
export interface EngineOut {
  playerHpChanged$:  Subject<HpPayload>;
  levelUp$:          Subject<LevelPayload>;
  gameOver$:         Subject<GameOverPayload>;
  enemyKilled$:      Subject<void>;
  eliteSpawned$:     Subject<void>;
  eliteHpChanged$:   Subject<ElitePayload | null>;
  weaponsChanged$:   Subject<WeaponPayload>;
  xpChanged$:        Subject<XpPayload>;
  gamePaused$:       Subject<boolean>;
}

/** UI → Engine */
export interface UIOut {
  upgradeSelected$: Subject<UpgradeId>;
  restartGame$:     Subject<void>;
  pauseToggle$:     Subject<void>;
}

@Injectable({ providedIn: 'root' })
export class GameBridgeService {
  readonly engine: EngineOut = {
    playerHpChanged$: new Subject(),
    levelUp$:         new Subject(),
    gameOver$:        new Subject(),
    enemyKilled$:     new Subject(),
    eliteSpawned$:    new Subject(),
    eliteHpChanged$:  new Subject(),
    weaponsChanged$:  new Subject(),
    xpChanged$:       new Subject(),
    gamePaused$:      new Subject(),
  };

  readonly ui: UIOut = {
    upgradeSelected$: new Subject(),
    restartGame$:     new Subject(),
    pauseToggle$:     new Subject(),
  };

  // Helpers for engine side
  emitHp(current: number, max: number)              { this.engine.playerHpChanged$.next({ current, max }); }
  emitXp(current: number, needed: number)           { this.engine.xpChanged$.next({ current, needed }); }
  emitWeapons(weapons: WeaponType[])                { this.engine.weaponsChanged$.next({ weapons }); }
  emitLevelUp(level: number, upgrades: LevelPayload['upgrades']) { this.engine.levelUp$.next({ level, upgrades }); }
  emitGameOver(p: GameOverPayload)                  { this.engine.gameOver$.next(p); }
  emitEliteHp(payload: ElitePayload | null)         { this.engine.eliteHpChanged$.next(payload); }
  emitKill()                                        { this.engine.enemyKilled$.next(); }
  emitPause(paused: boolean)                        { this.engine.gamePaused$.next(paused); }
}
