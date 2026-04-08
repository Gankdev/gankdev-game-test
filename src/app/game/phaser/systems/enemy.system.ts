import Phaser from 'phaser';

export type EnemyType = 'slime' | 'bat' | 'tank' | 'ghost' | 'bomber' | 'elite';

export interface EnemyDef {
  type: EnemyType;
  texture: string;
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  scale: number;
}

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  slime:  { type: 'slime',  texture: 'e_slime',  hp: 30,  damage: 8,  speed: 60,  xp: 1, scale: 1   },
  bat:    { type: 'bat',    texture: 'e_bat',    hp: 20,  damage: 6,  speed: 120, xp: 2, scale: 0.7 },
  tank:   { type: 'tank',   texture: 'e_tank',   hp: 200, damage: 20, speed: 40,  xp: 5, scale: 1.6 },
  ghost:  { type: 'ghost',  texture: 'e_ghost',  hp: 60,  damage: 12, speed: 80,  xp: 3, scale: 1   },
  bomber: { type: 'bomber', texture: 'e_bomber', hp: 50,  damage: 16, speed: 70,  xp: 4, scale: 1   },
  elite:  { type: 'elite',  texture: 'e_elite',  hp: 600, damage: 30, speed: 80,  xp: 40, scale: 2  },
};

export class EnemySystem {
  enemies!: Phaser.Physics.Arcade.Group;
  private scene!: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;
  private waveTimer  = 0;
  private waveInterval = 8000;
  private eliteTimer = 0;
  private eliteInterval = 30000;
  eliteEnemy: Phaser.Physics.Arcade.Sprite | null = null;

  init(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene  = scene;
    this.player = player;
    this.enemies = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 400 });
  }

  update(delta: number, gameTimeMs: number) {
    this.waveTimer += delta;
    this.eliteTimer += delta;

    const interval = this.calcWaveInterval(gameTimeMs);
    if (this.waveTimer >= interval) {
      this.waveTimer = 0;
      this.spawnWave(gameTimeMs);
    }

    if (this.eliteTimer >= this.eliteInterval && gameTimeMs >= 180000) {
      this.eliteTimer = 0;
      this.spawnElite();
    }

    // Move enemies toward player
    this.enemies.getChildren().forEach(go => {
      const e = go as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const speed = (e as any)['speed'] as number;
      this.scene.physics.moveTo(e, this.player.x, this.player.y, speed);
    });
  }

  private calcWaveInterval(ms: number): number {
    if (ms < 60000)  return 8000;
    if (ms < 90000)  return 6000;
    if (ms < 180000) return 5500;
    if (ms < 300000) return 4000;
    return 2500;
  }

  private waveSize(ms: number): number {
    if (ms < 60000)  return 4;
    if (ms < 90000)  return 6;
    if (ms < 120000) return 8;
    if (ms < 300000) return 12;
    return 20;
  }

  private availableTypes(ms: number): EnemyType[] {
    const types: EnemyType[] = ['slime'];
    if (ms >= 30000)  types.push('bat');
    if (ms >= 60000)  types.push('tank');
    if (ms >= 90000)  types.push('ghost');
    if (ms >= 120000) types.push('bomber');
    return types;
  }

  private spawnWave(ms: number) {
    const types = this.availableTypes(ms);
    const size  = this.waveSize(ms);
    for (let i = 0; i < size; i++) {
      const type = types[Phaser.Math.Between(0, types.length - 1)] as EnemyType;
      this.spawnEnemy(type);
    }
  }

  private spawnEnemy(type: EnemyType) {
    const cam = this.scene.cameras.main;
    const def = ENEMY_DEFS[type];
    const pos = this.randomOutsideCamera(cam);

    const e = this.enemies.get(pos.x, pos.y, def.texture) as Phaser.Physics.Arcade.Sprite | null;
    if (!e) return;
    e.setActive(true).setVisible(true).setDepth(3).setScale(def.scale);
    e.setAlpha(type === 'ghost' ? 0.6 : 1);
    (e as any)['hp']      = def.hp;
    (e as any)['maxHp']   = def.hp;
    (e as any)['damage']  = def.damage;
    (e as any)['speed']   = def.speed;
    (e as any)['xp']      = def.xp;
    (e as any)['type']    = type;
    (e as any)['isGhost'] = type === 'ghost';
    (e.body as Phaser.Physics.Arcade.Body).setCircle(14 * def.scale, 2, 2);
  }

  private spawnElite() {
    if (this.eliteEnemy?.active) return;
    const cam = this.scene.cameras.main;
    const pos = this.randomOutsideCamera(cam);
    const def = ENEMY_DEFS['elite'];

    const e = this.enemies.get(pos.x, pos.y, def.texture) as Phaser.Physics.Arcade.Sprite | null;
    if (!e) return;
    e.setActive(true).setVisible(true).setDepth(4).setScale(def.scale);
    (e as any)['hp']      = def.hp;
    (e as any)['maxHp']   = def.hp;
    (e as any)['damage']  = def.damage;
    (e as any)['speed']   = def.speed;
    (e as any)['xp']      = def.xp;
    (e as any)['type']    = 'elite';
    (e as any)['isElite'] = true;
    (e.body as Phaser.Physics.Arcade.Body).setCircle(22, 2, 2);
    this.eliteEnemy = e;
  }

  private randomOutsideCamera(cam: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const margin = 80;
    const side = Phaser.Math.Between(0, 3);
    switch (side) {
      case 0: return { x: Phaser.Math.Between(cam.worldView.left, cam.worldView.right), y: cam.worldView.top - margin };
      case 1: return { x: Phaser.Math.Between(cam.worldView.left, cam.worldView.right), y: cam.worldView.bottom + margin };
      case 2: return { x: cam.worldView.left - margin,  y: Phaser.Math.Between(cam.worldView.top, cam.worldView.bottom) };
      default: return { x: cam.worldView.right + margin, y: Phaser.Math.Between(cam.worldView.top, cam.worldView.bottom) };
    }
  }
}
