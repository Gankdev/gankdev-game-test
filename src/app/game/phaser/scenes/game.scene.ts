import Phaser from 'phaser';
import { GameBridgeService } from '../../../bridge/game-bridge.service';
import { WeaponSystem, PlayerStats } from '../systems/weapon.system';
import { EnemySystem, ENEMY_DEFS, EnemyType } from '../systems/enemy.system';
import { XpSystem } from '../systems/xp.system';
import { VfxSystem } from '../systems/vfx.system';
import { WeaponType } from '../../../bridge/game-events';
import { Subscription } from 'rxjs';

const ALL_WEAPON_TYPES: WeaponType[] = ['lightning', 'aura', 'nova', 'fragments'];

export class GameScene extends Phaser.Scene {
  private bridge!: GameBridgeService;
  private player!: Phaser.Physics.Arcade.Sprite;
  private weaponSys!: WeaponSystem;
  private enemySys!: EnemySystem;
  private xpSys!: XpSystem;
  private vfxSys!: VfxSystem;
  private stats!: PlayerStats;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private gameTimeMs = 0;
  private alive = true;
  private paused = false;
  private iframes = 0;
  private subs: Subscription[] = [];
  private bg!: Phaser.GameObjects.TileSprite;

  constructor() { super({ key: 'GameScene' }); }

  preload() { /* textures generated in create */ }

  create() {
    this.bridge = this.registry.get('bridge') as GameBridgeService;
    this.buildTextures();
    this.resetState();
    this.buildWorld();
    this.buildInput();
    this.buildSystems();
    this.buildCollisions();
    this.buildSubscriptions();
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private resetState() {
    this.gameTimeMs = 0;
    this.alive = true;
    this.paused = false;
    this.iframes = 0;
    this.stats = {
      hp: 100, maxHp: 100, speed: 160, damage: 20,
      cooldownMult: 1, range: 300, piercing: 0,
      areaMult: 1, vampirism: 0,
      hasShield: false, hasMagnet: false, hasBerserker: false, hasExplosion: false,
    };
  }

  private buildWorld() {
    this.bg = this.add.tileSprite(0, 0, 4000, 4000, 'bg_tile').setOrigin(0).setDepth(0);
  }

  private buildInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard!.on('keydown-P',   () => this.togglePause());
  }

  private buildSystems() {
    this.player = this.physics.add.sprite(0, 0, 'player').setDepth(6).setScale(1.2);
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(13, 3, 3);

    this.vfxSys = new VfxSystem();
    this.vfxSys.init(this);

    this.weaponSys = new WeaponSystem();
    this.weaponSys.init(this, this.player, this.physics.add.group(), this.stats);

    this.enemySys = new EnemySystem();
    this.enemySys.init(this, this.player);

    this.xpSys = new XpSystem();
    this.xpSys.init(this, this.player, this.bridge, this.stats, this.weaponSys.getTypes());

    this.weaponSys['enemies'] = this.enemySys.enemies;

    this.bridge.emitHp(this.stats.hp, this.stats.maxHp);
    this.bridge.emitXp(0, 14);
    this.bridge.emitWeapons(['orb']);
  }

  private buildCollisions() {
    // Projectile hits enemy
    this.physics.add.overlap(
      this.weaponSys.projectiles,
      this.enemySys.enemies,
      (proj, enemy) => this.onProjHitEnemy(
        proj as Phaser.Physics.Arcade.Sprite,
        enemy as Phaser.Physics.Arcade.Sprite
      )
    );

    // Player collects gem
    this.physics.add.overlap(
      this.player,
      this.xpSys.gems,
      (_, gem) => this.xpSys.collectGem(gem as Phaser.Physics.Arcade.Sprite)
    );

    // Enemy touches player
    this.physics.add.overlap(
      this.player,
      this.enemySys.enemies,
      (_, enemy) => this.onEnemyTouchPlayer(enemy as Phaser.Physics.Arcade.Sprite)
    );
  }

  private buildSubscriptions() {
    this.subs.push(
      this.bridge.ui.upgradeSelected$.subscribe((id: string) => {
        this.xpSys.applyUpgrade(id);
        if (id === 'new_weapon') this.addRandomWeapon();
        this.bridge.emitWeapons(this.weaponSys.getTypes());
        this.paused = false;
        this.bridge.emitPause(false);
      }),
      this.bridge.ui.restartGame$.subscribe(() => this.restartGame()),
      this.bridge.ui.pauseToggle$.subscribe(() => this.togglePause()),
    );
  }

  override update(_: number, delta: number) {
    if (!this.alive || this.paused) return;
    this.gameTimeMs += delta;
    this.iframes = Math.max(0, this.iframes - delta);

    this.movePlayer(delta);
    this.weaponSys.update(delta);
    this.enemySys.update(delta, this.gameTimeMs);
    this.xpSys.update();

    const elite = this.enemySys.eliteEnemy;
    if (elite?.active) {
      this.bridge.emitEliteHp({ current: (elite as any)['hp'], max: (elite as any)['maxHp'] });
    }

    this.bg.setTilePosition(this.cameras.main.scrollX * 0.5, this.cameras.main.scrollY * 0.5);
  }

  private movePlayer(delta: number) {
    let vx = 0, vy = 0;
    const spd = this.getBerserkerSpeed();
    if (this.wasd['left'].isDown  || this.cursors.left.isDown)  vx = -spd;
    if (this.wasd['right'].isDown || this.cursors.right.isDown) vx =  spd;
    if (this.wasd['up'].isDown    || this.cursors.up.isDown)    vy = -spd;
    if (this.wasd['down'].isDown  || this.cursors.down.isDown)  vy =  spd;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
    if (vx !== 0) this.player.setFlipX(vx < 0);
  }

  private getBerserkerSpeed(): number {
    if (this.stats.hasBerserker && this.stats.hp / this.stats.maxHp < 0.3) {
      return this.stats.speed * 1.5;
    }
    return this.stats.speed;
  }

  private getBerserkerDamage(): number {
    if (this.stats.hasBerserker && this.stats.hp / this.stats.maxHp < 0.3) {
      return this.stats.damage * 1.5;
    }
    return this.stats.damage;
  }

  private onProjHitEnemy(proj: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    if (!proj.active || !enemy.active) return;
    const isNova = (proj as any)['isNova'] as boolean;
    const dmg = this.getBerserkerDamage();

    if (isNova) {
      this.doExplosion(enemy.x, enemy.y, 100, dmg * 1.75);
      proj.setActive(false).setVisible(false);
      return;
    }

    this.weaponSys.hurtEnemy(enemy, dmg);
    this.vfxSys.spawnDamageNumber(enemy.x, enemy.y - 20, dmg, '#ffffff');
    this.vfxSys.hitFlash(enemy);

    const pierce = ((proj as any)['pierce'] as number) - 1;
    (proj as any)['pierce'] = pierce;
    if (pierce <= 0) proj.setActive(false).setVisible(false);

    if ((enemy as any)['hp'] <= 0) this.killEnemy(enemy);
  }

  private onEnemyTouchPlayer(enemy: Phaser.Physics.Arcade.Sprite) {
    if (this.iframes > 0) return;
    const dmg = (enemy as any)['damage'] as number;
    this.iframes = 500;

    if (this.stats.hasShield) { this.stats.hasShield = false; return; }

    this.stats.hp = Math.max(0, this.stats.hp - dmg);
    this.bridge.emitHp(this.stats.hp, this.stats.maxHp);
    this.vfxSys.damageOverlay();
    this.vfxSys.screenShake(5, 150);

    if (this.stats.hp <= 0) this.triggerGameOver();
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    const type = (enemy as any)['type'] as EnemyType;
    const xp   = (enemy as any)['xp'] as number;

    this.xpSys.kills++;
    this.bridge.emitKill();
    this.vfxSys.burstParticles(enemy.x, enemy.y, ENEMY_DEFS[type].texture === 'e_elite' ? 0xff0000 : 0x88ff88);
    this.xpSys.spawnGems(enemy.x, enemy.y, xp);

    if (this.stats.vampirism > 0) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.vampirism);
      this.bridge.emitHp(this.stats.hp, this.stats.maxHp);
    }
    if (this.stats.hasExplosion && Math.random() < 0.2) {
      this.doExplosion(enemy.x, enemy.y, 80 * this.stats.areaMult, 40);
    }
    if (enemy === this.enemySys.eliteEnemy) {
      this.enemySys.eliteEnemy = null;
      this.bridge.emitEliteHp(null);
    }
    enemy.setActive(false).setVisible(false);
  }

  private doExplosion(x: number, y: number, radius: number, damage: number) {
    this.vfxSys.explosionRing(x, y, radius);
    this.vfxSys.screenShake(6, 200);
    this.enemySys.enemies.getChildren().forEach(go => {
      const e = go as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= radius) {
        this.weaponSys.hurtEnemy(e, damage);
        this.vfxSys.spawnDamageNumber(e.x, e.y - 20, damage, '#ff8800');
        if ((e as any)['hp'] <= 0) this.killEnemy(e);
      }
    });
  }

  private addRandomWeapon() {
    const current = this.weaponSys.getTypes();
    const available = ALL_WEAPON_TYPES.filter(t => !current.includes(t));
    if (available.length === 0) return;
    const pick = available[Phaser.Math.Between(0, available.length - 1)];
    this.weaponSys.addWeapon(pick);
  }

  private togglePause() {
    if (!this.alive) return;
    this.paused = !this.paused;
    this.bridge.emitPause(this.paused);
  }

  private triggerGameOver() {
    this.alive = false;
    this.bridge.emitGameOver({
      timeMs: this.gameTimeMs,
      kills:  this.xpSys.kills,
      level:  this.xpSys.level,
      upgrades: [],
    });
  }

  private restartGame() {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.enemySys.enemies.clear(true, true);
    this.weaponSys.projectiles.clear(true, true);
    this.xpSys.gems.clear(true, true);
    this.scene.restart();
  }

  private buildTextures() {
    this.makeCircleTex('player',   32, 0x00ccff, 0xffffff, 2);
    this.makeCircleTex('e_slime',  28, 0x22cc44, 0x116622, 2);
    this.makeCircleTex('e_bat',    22, 0xaa44ff, 0x661188, 2);
    this.makeCircleTex('e_tank',   40, 0xcc2222, 0x881111, 3);
    this.makeCircleTex('e_ghost',  28, 0x88ddff, 0x4488aa, 2);
    this.makeCircleTex('e_bomber', 28, 0xff8800, 0xcc4400, 2);
    this.makeCircleTex('e_elite',  44, 0xff2222, 0xffaa00, 4);
    this.makeProjTex('proj_orb',   8,  0x44ddff);
    this.makeProjTex('proj_light', 8,  0xffff44);
    this.makeProjTex('proj_nova',  12, 0x4488ff);
    this.makeProjTex('proj_frag',  5,  0xffaa44);
    this.makeGemTex();
    this.makeBgTile();
  }

  private makeCircleTex(key: string, size: number, fill: number, stroke: number, strokeW: number) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({} as any);
    const r = size / 2;
    g.fillStyle(fill, 1);
    g.fillCircle(r, r, r - strokeW);
    g.lineStyle(strokeW, stroke, 1);
    g.strokeCircle(r, r, r - strokeW);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeProjTex(key: string, size: number, color: number) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({} as any);
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeGemTex() {
    if (this.textures.exists('gem')) return;
    const g = this.make.graphics({} as any);
    g.fillStyle(0xffee00, 1);
    g.fillTriangle(6, 0, 12, 8, 0, 8);
    g.fillTriangle(6, 14, 12, 6, 0, 6);
    g.generateTexture('gem', 12, 14);
    g.destroy();
  }

  private makeBgTile() {
    if (this.textures.exists('bg_tile')) return;
    const g = this.make.graphics({} as any);
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0x22224e, 0.5);
    g.strokeRect(0, 0, 64, 64);
    g.fillStyle(0x22224e, 0.4);
    g.fillRect(2, 2, 2, 2);
    g.fillRect(34, 34, 2, 2);
    g.generateTexture('bg_tile', 64, 64);
    g.destroy();
  }
}
