import Phaser from 'phaser';

export class VfxSystem {
  private scene!: Phaser.Scene;
  private damageTexts: Phaser.GameObjects.Text[] = [];

  init(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawnDamageNumber(x: number, y: number, damage: number, color = '#ffffff') {
    const text = this.scene.add.text(x, y, Math.floor(damage).toString(), {
      fontSize: '14px',
      color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setDepth(10).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  hitFlash(sprite: Phaser.Physics.Arcade.Sprite) {
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      repeat: 1,
      onComplete: () => { if (sprite.active) sprite.setAlpha(sprite.getData('baseAlpha') ?? 1); },
    });
  }

  screenShake(intensity = 4, duration = 120) {
    this.scene.cameras.main.shake(duration, intensity / 1000);
  }

  burstParticles(x: number, y: number, color: number, count = 8) {
    const gfx = this.scene.add.graphics().setDepth(9);
    gfx.fillStyle(color, 1);

    const particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = Phaser.Math.Between(40, 100);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
    }

    let elapsed = 0;
    const duration = 400;
    const listener = (_: Phaser.Scene, delta: number) => {
      elapsed += delta;
      const t = elapsed / duration;
      if (t >= 1) { gfx.destroy(); this.scene.events.off('update', listener); return; }
      gfx.clear();
      gfx.fillStyle(color, 1 - t);
      particles.forEach(p => {
        p.x += p.vx * (delta / 1000);
        p.y += p.vy * (delta / 1000);
        p.vy += 80 * (delta / 1000);
        gfx.fillCircle(p.x, p.y, 4 * (1 - t));
      });
    };
    this.scene.events.on('update', listener);
  }

  explosionRing(x: number, y: number, radius: number) {
    const gfx = this.scene.add.graphics().setDepth(8);
    let elapsed = 0;
    const duration = 350;
    const listener = (_: Phaser.Scene, delta: number) => {
      elapsed += delta;
      const t = elapsed / duration;
      if (t >= 1) { gfx.destroy(); this.scene.events.off('update', listener); return; }
      gfx.clear();
      gfx.lineStyle(3 * (1 - t), 0xff8800, 1 - t);
      gfx.strokeCircle(x, y, radius * t);
    };
    this.scene.events.on('update', listener);
  }

  levelUpFlash() {
    const cam = this.scene.cameras.main;
    const flash = this.scene.add.rectangle(
      cam.worldView.centerX, cam.worldView.centerY,
      cam.width, cam.height,
      0xffdd00, 0.35
    ).setDepth(20).setScrollFactor(0);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  damageOverlay() {
    const cam = this.scene.cameras.main;
    const overlay = this.scene.add.rectangle(
      cam.worldView.centerX, cam.worldView.centerY,
      cam.width, cam.height,
      0xff0000, 0.3
    ).setDepth(19).setScrollFactor(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => overlay.destroy(),
    });
  }
}
