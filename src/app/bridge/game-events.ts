export type WeaponType = 'orb' | 'lightning' | 'aura' | 'nova' | 'fragments';

export type UpgradeId =
  | 'hp_plus' | 'speed_plus' | 'damage_plus' | 'vampirism'
  | 'piercing' | 'area_plus' | 'cooldown_plus'
  | 'new_weapon' | 'shield' | 'magnet' | 'berserker' | 'explosion_on_death';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
}

export interface HpPayload     { current: number; max: number }
export interface LevelPayload  { level: number; upgrades: Upgrade[] }
export interface GameOverPayload { timeMs: number; kills: number; level: number; upgrades: string[] }
export interface WeaponPayload { weapons: WeaponType[] }
export interface XpPayload     { current: number; needed: number }
export interface ElitePayload  { current: number; max: number }

export const UPGRADE_POOL: Upgrade[] = [
  { id: 'hp_plus',            name: 'Vida+',         description: '+25 HP máximo e cura 25',    icon: '❤️'  },
  { id: 'speed_plus',         name: 'Velocidade+',   description: '+15% velocidade',             icon: '💨'  },
  { id: 'damage_plus',        name: 'Dano+',         description: '+20% dano total',             icon: '⚔️'  },
  { id: 'vampirism',          name: 'Vampirismo',    description: '+2 HP por inimigo morto',     icon: '🩸'  },
  { id: 'piercing',           name: 'Perfurante',    description: 'Projéteis atravessam +1',     icon: '🎯'  },
  { id: 'area_plus',          name: 'Área+',         description: '+20% raio de explosões',      icon: '💥'  },
  { id: 'cooldown_plus',      name: 'Cadência+',     description: '-15% cooldown das armas',     icon: '⚡'  },
  { id: 'new_weapon',         name: 'Nova Arma',     description: 'Adiciona arma ao arsenal',    icon: '🗡️'  },
  { id: 'shield',             name: 'Escudo',        description: 'Bloqueia próximo dano',       icon: '🛡️'  },
  { id: 'magnet',             name: 'Magnet',        description: 'Atrai gems automaticamente',  icon: '🧲'  },
  { id: 'berserker',          name: 'Berserker',     description: '+50% dano/vel abaixo de 30%', icon: '😡'  },
  { id: 'explosion_on_death', name: 'Explosão',      description: '20% chance inimigos explodem',icon: '💣'  },
];
