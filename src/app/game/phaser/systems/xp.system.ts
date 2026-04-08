import Phaser from 'phaser';
import { GameBridgeService } from '../../../bridge/game-bridge.service';
import { UPGRADE_POOL, Upgrade } from '../../../bridge/game-events';
import { PlayerStats } from './weapon.system';
import { WeaponType } from '../../../bridge/game-events';

export class XpSystem {
  gems!: Phaser.Physics.Arcade.Group;
  level = 1;
  xp = 0;
  kills = 0;

  private scene!: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;
  private bridge!: GameBridgeService;
  private stats!: PlayerStats;
  private activeWeapons!: WeaponType[];
  private waitingForUpgrade = false;

  init(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    bridge: GameBridgeService,
    stats: PlayerStats,
    activeWeapons: WeaponType[]
  ) {
    this.scene  = scene;
    this.player = player;
    this.bridge = bridge;
    this.stats  = stats;
    this.activeWeapons = activeWeapons;
    this.gems   = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 600 });
  }

  spawnGems(x: number, y: number, xpValue: number) {
    const count = Math.min(xpValue, 5);
    for (let i = 0; i < count; i++) {
      const g = this.gems.get(
        x + Phaser.Math.Between(-12, 12),
        y + Phaser.Math.Between(-12, 12),
        'gem'
      ) as Phaser.Physics.Arcade.Sprite | null;
      if (!g) continue;
      g.setActive(true).setVisible(true).setDepth(2);
      (g as any)['xpVal'] = Math.ceil(xpValue / count);
      (g.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  collectGem(gem: Phaser.Physics.Arcade.Sprite) {
    const val = (gem as any)['xpVal'] as number ?? 1;
    this.xp += val;
    gem.setActive(false).setVisible(false);
    const needed = this.xpNeeded();
    this.bridge.emitXp(this.xp, needed);
    if (this.xp >= needed && !this.waitingForUpgrade) {
      this.triggerLevelUp();
    }
  }

  update() {
    if (!this.stats.hasMagnet) return;
    const px = this.player.x;
    const py = this.player.y;
    const magnetRadius = 200;
    this.gems.getChildren().forEach(go => {
      const g = go as Phaser.Physics.Arcade.Sprite;
      if (!g.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, g.x, g.y);
      if (dist <= magnetRadius) {
        this.scene.physics.moveTo(g, px, py, 300);
      }
    });
  }

  private xpNeeded(): number {
    return Math.floor(10 * this.level * Math.pow(1.4, this.level - 1));
  }

  private triggerLevelUp() {
    this.waitingForUpgrade = true;
    this.xp = 0;
    this.level++;
    const pool = this.buildUpgradePool();
    const picks = Phaser.Utils.Array.Shuffle(pool).slice(0, 3) as Upgrade[];
    this.bridge.emitLevelUp(this.level, picks);
  }

  applyUpgrade(id: string) {
    this.waitingForUpgrade = false;
    switch (id) {
      case 'hp_plus':     this.stats.maxHp += 25; this.stats.hp = Math.min(this.stats.hp + 25, this.stats.maxHp); break;
      case 'speed_plus':  this.stats.speed  *= 1.15; break;
      case 'damage_plus': this.stats.damage *= 1.2; break;
      case 'vampirism':   this.stats.vampirism += 2; break;
      case 'piercing':    this.stats.piercing  += 1; break;
      case 'area_plus':   this.stats.areaMult  *= 1.2; break;
      case 'cooldown_plus': this.stats.cooldownMult = Math.min(this.stats.cooldownMult * 1.15, 3); break;
      case 'shield':      this.stats.hasShield   = true; break;
      case 'magnet':      this.stats.hasMagnet   = true; break;
      case 'berserker':   this.stats.hasBerserker = true; break;
      case 'explosion_on_death': this.stats.hasExplosion = true; break;
    }
    this.bridge.emitHp(this.stats.hp, this.stats.maxHp);
  }

  private buildUpgradePool(): Upgrade[] {
    return UPGRADE_POOL.filter((u: Upgrade) => {
      if (u.id === 'vampirism') return true;
      if (u.id === 'new_weapon') return this.activeWeapons.length < 4;
      if (u.id === 'shield') return !this.stats.hasShield;
      if (u.id === 'magnet') return !this.stats.hasMagnet;
      if (u.id === 'berserker') return !this.stats.hasBerserker;
      if (u.id === 'explosion_on_death') return !this.stats.hasExplosion;
      return true;
    });
  }
}
