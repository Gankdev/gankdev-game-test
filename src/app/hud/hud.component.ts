import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameBridgeService } from '../bridge/game-bridge.service';
import { WeaponType } from '../bridge/game-events';
import { UpgradeModalComponent } from './upgrade-modal.component';
import { GameOverComponent } from './game-over.component';
import { LevelPayload, GameOverPayload } from '../bridge/game-events';

const WEAPON_ICONS: Record<WeaponType, string> = {
  orb:       '🔵',
  lightning: '⚡',
  aura:      '🔥',
  nova:      '❄️',
  fragments: '🟠',
};

@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [CommonModule, UpgradeModalComponent, GameOverComponent],
  templateUrl: './hud.component.html',
  styleUrl: './hud.component.css',
})
export class HudComponent implements OnInit, OnDestroy {
  private bridge = inject(GameBridgeService);
  private subs: Subscription[] = [];

  hp        = signal(100);
  maxHp     = signal(100);
  xp        = signal(0);
  xpNeeded  = signal(14);
  level     = signal(1);
  kills     = signal(0);
  timeMs    = signal(0);
  weapons   = signal<WeaponType[]>(['orb']);
  eliteHp   = signal<{ current: number; max: number } | null>(null);
  paused    = signal(false);

  showUpgrade = signal(false);
  upgradeData = signal<LevelPayload | null>(null);
  showGameOver = signal(false);
  gameOverData = signal<GameOverPayload | null>(null);

  private timer?: ReturnType<typeof setInterval>;

  get hpPct()  { return (this.hp() / this.maxHp()) * 100; }
  get xpPct()  { return (this.xp() / this.xpNeeded()) * 100; }
  get hpColor(){ return this.hpPct > 50 ? '#22c55e' : this.hpPct > 25 ? '#eab308' : '#ef4444'; }
  get formattedTime() {
    const s = Math.floor(this.timeMs() / 1000);
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }

  weaponIcon(w: WeaponType) { return WEAPON_ICONS[w]; }

  ngOnInit() {
    let timerRunning = false;
    this.subs.push(
      this.bridge.engine.playerHpChanged$.subscribe(p => { this.hp.set(p.current); this.maxHp.set(p.max); }),
      this.bridge.engine.xpChanged$.subscribe(p => { this.xp.set(p.current); this.xpNeeded.set(p.needed); }),
      this.bridge.engine.weaponsChanged$.subscribe(p => this.weapons.set(p.weapons)),
      this.bridge.engine.enemyKilled$.subscribe(() => this.kills.update(k => k + 1)),
      this.bridge.engine.eliteHpChanged$.subscribe(p => this.eliteHp.set(p)),
      this.bridge.engine.gamePaused$.subscribe(p => this.paused.set(p)),
      this.bridge.engine.levelUp$.subscribe(p => {
        this.level.set(p.level);
        this.upgradeData.set(p);
        this.showUpgrade.set(true);
      }),
      this.bridge.engine.gameOver$.subscribe(p => {
        this.gameOverData.set({ ...p, timeMs: this.timeMs() });
        this.showGameOver.set(true);
        clearInterval(this.timer);
      }),
    );

    this.timer = setInterval(() => {
      if (!this.paused() && !this.showUpgrade() && !this.showGameOver()) {
        this.timeMs.update(t => t + 100);
      }
    }, 100);
  }

  onUpgradeChosen(id: string) {
    this.showUpgrade.set(false);
    this.bridge.ui.upgradeSelected$.next(id as any);
  }

  onRestart() {
    this.showGameOver.set(false);
    this.kills.set(0);
    this.timeMs.set(0);
    this.level.set(1);
    this.xp.set(0);
    this.bridge.ui.restartGame$.next();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    clearInterval(this.timer);
  }
}
