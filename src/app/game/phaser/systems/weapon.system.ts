import Phaser from 'phaser';
import { WeaponType } from '../../../bridge/game-events';

export interface PlayerStats {
  hp: number; maxHp: number; speed: number; damage: number;
  cooldownMult: number; range: number; piercing: number;
  areaMult: number; vampirism: number;
  hasShield: boolean; hasMagnet: boolean; hasBerserker: boolean; hasExplosion: boolean;
}

export interface WeaponInstance {
  type: WeaponType;
  cooldown: number;   // ms
  elapsed: number;
}

const BASE_COOLDOWNS: Record<WeaponType, number> = {
  orb:       1000,
  lightning: 1250,
  aura:      200,
  nova:      2500,
  fragments: 833,
};

export class WeaponSystem {
  weapons: WeaponInstance[] = [];
  private scene!: Phaser.Scene;
  private enemies!: Phaser.Physics.Arcade.Group;
  projectiles!: Phaser.Physics.Arcade.Group;
  private player!: Phaser.Physics.Arcade.Sprite;
  private stats!: PlayerStats;
  private auraCircle!: Phaser.GameObjects.Arc;

  init(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    enemies: Phaser.Physics.Arcade.Group,
    stats: PlayerStats
  ) {
    this.scene  = scene;
    this.player = player;
    this.enemies = enemies;
    this.stats  = stats;
    this.projectiles = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 300 });

    this.auraCircle = scene.add.arc(0, 0, 80, 0, 360, false, 0xff4400, 0.12);
    this.addWeapon('orb');
  }

  addWeapon(type: WeaponType) {
    if (this.weapons.length >= 4) return;
    if (this.weapons.find(w => w.type === type)) return;
    this.weapons.push({ type, cooldown: BASE_COOLDOWNS[type], elapsed: BASE_COOLDOWNS[type] });
  }

  getTypes(): WeaponType[] { return this.weapons.map(w => w.type); }

  update(delta: number) {
    const px = this.player.x;
    const py = this.player.y;
    this.auraCircle.setPosition(px, py);
    this.auraCircle.setVisible(this.weapons.some(w => w.type === 'aura'));

    for (const w of this.weapons) {
      w.elapsed += delta * this.stats.cooldownMult;
      if (w.elapsed < w.cooldown) continue;
      w.elapsed = 0;
      this.fire(w, px, py);
    }

    // Recycle off-screen projectiles
    this.projectiles.getChildren().forEach(go => {
      const s = go as Phaser.Physics.Arcade.Sprite;
      if (!s.active) return;
      const cam = this.scene.cameras.main;
      const margin = 100;
      if (s.x < cam.worldView.left - margin || s.x > cam.worldView.right + margin ||
          s.y < cam.worldView.top  - margin || s.y > cam.worldView.bottom + margin) {
        s.setActive(false).setVisible(false);
      }
    });
  }

  private fire(w: WeaponInstance, px: number, py: number) {
    const nearest = this.nearestEnemy(px, py, this.stats.range);
    if (w.type === 'aura') { this.damageAura(); return; }
    if (!nearest && w.type !== 'nova') return;

    switch (w.type) {
      case 'orb':       this.spawnProjectile('proj_orb',  px, py, nearest!, 1, 400); break;
      case 'lightning': this.spawnProjectile('proj_light', px, py, nearest!, 1, 450); break;
      case 'nova':      this.spawnNova(px, py); break;
      case 'fragments': this.spawnFragments(px, py, nearest!); break;
    }
  }

  private spawnProjectile(
    tex: string, px: number, py: number,
    target: Phaser.Physics.Arcade.Sprite, pierce: number, speed: number
  ) {
    const p = this.projectiles.get(px, py, tex) as Phaser.Physics.Arcade.Sprite | null;
    if (!p) return;
    p.setActive(true).setVisible(true);
    p.setDepth(5);
    (p as any)['pierce'] = this.stats.piercing + pierce;
    (p as any)['weaponType'] = tex;
    this.scene.physics.moveTo(p, target.x, target.y, speed);
  }

  private spawnNova(px: number, py: number) {
    const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
    const p = this.projectiles.get(px, py, 'proj_nova') as Phaser.Physics.Arcade.Sprite | null;
    if (!p) return;
    p.setActive(true).setVisible(true).setDepth(5);
    (p as any)['pierce'] = 99;
    (p as any)['isNova'] = true;
    const speed = 180;
    (p.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private spawnFragments(px: number, py: number, target: Phaser.Physics.Arcade.Sprite) {
    const baseAngle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + (i * 25 * Math.PI / 180);
      const p = this.projectiles.get(px, py, 'proj_frag') as Phaser.Physics.Arcade.Sprite | null;
      if (!p) continue;
      p.setActive(true).setVisible(true).setDepth(5);
      (p as any)['pierce'] = this.stats.piercing;
      const speed = 420;
      (p.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  private damageAura() {
    const px = this.player.x;
    const py = this.player.y;
    const radius = 80 * this.stats.areaMult;
    this.enemies.getChildren().forEach(go => {
      const e = go as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
      if (dist <= radius) {
        const dmg = this.stats.damage * 0.08;
        this.hurtEnemy(e, dmg);
      }
    });
  }

  hurtEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number) {
    const hp = (enemy as any)['hp'] as number;
    (enemy as any)['hp'] = hp - damage;
  }

  private nearestEnemy(px: number, py: number, range: number): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let minDist = range;
    this.enemies.getChildren().forEach(go => {
      const e = go as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(px, py, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
  }
}
