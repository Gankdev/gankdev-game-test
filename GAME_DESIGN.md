# Gankdev Survivors — Game Design Document

> Roguelite auto-shooter top-down. Sobreviva hordas crescentes enquanto evolui seu personagem com upgrades passivos.
> Jogo de teste da **Gankdev IA Game Engine** — valida todas as camadas: ECS, Angular HUD, GameBridge, VFX.

---

## Visão Geral

Você controla um único personagem numa arena infinita. Inimigos aparecem em hordas que crescem com o tempo. Seu personagem atira **automaticamente** no inimigo mais próximo — sua única responsabilidade é **se mover** e **escolher upgrades** quando subir de nível.

O objetivo é simples: **sobreviva o máximo de tempo possível.**

---

## Controles

| Ação | Teclado | Gamepad |
|------|---------|---------|
| Mover | `WASD` ou `↑ ↓ ← →` | Analógico esquerdo |
| Pausar | `ESC` ou `P` | `Start` |

> Não há botão de ataque. O personagem atira sozinho, sempre no inimigo mais próximo dentro do alcance.

---

## O Personagem

### Stats base (nível 1)

| Stat | Valor | Descrição |
|------|-------|-----------|
| HP | 100 | Vida máxima |
| Velocidade | 160 px/s | Velocidade de movimento |
| Dano | 20 | Dano por projétil |
| Cadência | 1 tiro/s | Ataques por segundo |
| Alcance | 300 px | Distância máxima de detecção |
| Perfuração | 0 | Quantos inimigos o projétil atravessa |

### Progressão de nível

Cada nível exige mais XP que o anterior:

```
XP para nível N = 10 × N × 1.4
```

| Nível | XP necessário (acumulado) |
|-------|--------------------------|
| 2 | 14 |
| 3 | 34 |
| 4 | 62 |
| 5 | 100 |
| 10 | ~380 |
| 20 | ~1.800 |

Ao subir de nível → **tela de upgrade aparece**, jogo pausa, escolha 1 de 3 opções.

---

## Sistema de Armas

O personagem começa com **1 arma** e pode ter até **4 armas simultâneas**. Cada arma tem cooldown independente e atira automaticamente.

### Armas disponíveis

#### Orb Básico *(começa com essa)*
Projétil simples que vai em linha reta.
- Dano: 20 | Cadência: 1/s | Alcance: 300px

#### Lightning Bolt
Projétil elétrico que **encadeia** para 2 inimigos próximos após o impacto.
- Dano: 15 por alvo | Cadência: 0.8/s | Alcance: 350px
- Chain range: 120px

#### Aura de Fogo
Não é projétil — emite dano em área ao redor do personagem continuamente.
- Dano: 8/s | Raio: 80px | Sem alcance de detecção (sempre ativo)

#### Nova Glacial
Projétil lento que **explode** ao atingir o primeiro inimigo, causando dano em área e aplicando **slow** por 2s.
- Dano: 35 (área: 100px) | Cadência: 0.4/s | Slow: -50% velocidade

#### Fragmentos
Dispara **3 projéteis em leque** de uma vez.
- Dano: 12 por fragmento | Cadência: 1.2/s | Spread: 25°

---

## Upgrades (escolha ao subir de nível)

A tela de upgrade sorteia **3 opções** aleatórias de uma pool. Upgrades podem aparecer múltiplas vezes (com efeito cumulativo).

### Upgrades de Stats

| Nome | Efeito |
|------|--------|
| **Vida +** | +25 HP máximo (e cura 25 HP) |
| **Velocidade +** | +15% velocidade de movimento |
| **Dano +** | +20% dano de todas as armas |
| **Vampirismo** | Recupera 2 HP por inimigo morto |
| **Perfurante** | Projéteis atravessam +1 inimigo |
| **Área +** | +20% raio de explosões e auras |
| **Cadência +** | -15% cooldown de todas as armas (mais tiros) |

### Upgrades de Armas

| Nome | Efeito |
|------|--------|
| **Nova Arma** | Adiciona uma arma nova ao arsenal (se < 4) |
| **Evoluir Arma** | Melhora uma arma existente para tier 2 |

### Upgrades Especiais (raros)

| Nome | Efeito |
|------|--------|
| **Escudo** | Bloqueia o próximo dano recebido (1 carga) |
| **Magnet** | XP gems são coletadas automaticamente em raio 200px |
| **Berserker** | Abaixo de 30% HP: +50% dano e velocidade |
| **Explosão ao Morrer** | Inimigos mortos têm 20% chance de explodir causando 40 de dano em área |

---

## Inimigos

### Tipos

#### Slime *(spawn: 0s)*
Inimigo básico. Anda em direção ao jogador.
- HP: 30 | Dano: 10 | Velocidade: 60px/s | XP: 1

#### Bat *(spawn: 30s)*
Mais rápido e menor. Difícil de acertar.
- HP: 20 | Dano: 8 | Velocidade: 120px/s | XP: 2

#### Tank *(spawn: 60s)*
Grande, lento, mas absorve muito dano. Empurra o jogador ao contato.
- HP: 200 | Dano: 25 | Velocidade: 40px/s | XP: 5 | Knockback no jogador

#### Ghost *(spawn: 90s)*
Atravessa outros inimigos. Ignora knockback.
- HP: 60 | Dano: 15 | Velocidade: 80px/s | XP: 3

#### Bomber *(spawn: 120s)*
Ao morrer, explode causando 30 dano em 100px.
- HP: 50 | Dano: 20 | Velocidade: 70px/s | XP: 4

#### Elite *(spawn: 180s, raro)*
Versão vermelha de qualquer inimigo com 3× stats. Spawna sozinho.
- HP/Dano/Velocidade: ×3 | XP: ×8 | Tem barra de vida própria no HUD

### Curva de dificuldade

O jogo fica mais difícil conforme o tempo passa:

| Tempo | Evento |
|-------|--------|
| 0:00 | Apenas Slimes. 3 por wave, wave a cada 8s |
| 0:30 | Bats começam a aparecer |
| 1:00 | Tanks aparecem. Wave size aumenta para 6 |
| 1:30 | Ghosts aparecem. Wave a cada 6s |
| 2:00 | Bombers aparecem. Wave size = 10 |
| 3:00 | Elites começam a spawnar. Wave a cada 5s |
| 5:00 | Wave size = 20. Todos os tipos simultâneos |
| 7:00 | **Modo caos** — spawn contínuo sem pausa entre waves |

---

## XP e Gems

Ao morrer, cada inimigo dropa uma **XP Gem** no chão. O jogador coleta ao tocar. Gems não somem.

- Slime → 1 gem (valor 1 XP)
- Bat → 1 gem (valor 2 XP)
- Tank → 3 gems (valor 5 XP total)
- Ghost → 1 gem (valor 3 XP)
- Elite → 8 gems (valor 8 XP total)

Com o upgrade **Magnet**, gems em raio 200px são atraídas automaticamente.

---

## Dano e Morte

### Recebendo dano
- Contato com inimigo → dano contínuo (dano/s do inimigo)
- Após tomar dano → **0.5s de invencibilidade** (iframes)
- Personagem pisca em vermelho durante iframes

### Morte
- HP chega a 0 → animação de morte → **Game Over screen**
- Mostra: tempo sobrevivido, inimigos mortos, nível alcançado, upgrades escolhidos

---

## HUD (Interface Angular)

Todos os elementos de UI rodam no Angular, por cima do canvas.

```
┌─────────────────────────────────────────────────────┐
│  ❤️ ████████████████░░░░  80/100    ⏱ 02:34        │
│  ⭐ ██████░░░░░░░░░░░░░░  Nível 4                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│              [ canvas do jogo ]                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  🗡 Orb  🌩 Lightning  🔥 Aura       Mortos: 142   │
└─────────────────────────────────────────────────────┘
```

### Elementos do HUD

| Elemento | Posição | Descrição |
|----------|---------|-----------|
| Barra de HP | Topo esquerdo | Gradiente verde→vermelho conforme HP cai |
| Timer | Topo direito | Tempo sobrevivido em MM:SS |
| Barra de XP | Abaixo do HP | Progresso até próximo nível |
| Indicador de nível | Ao lado da XP | "Nível X" |
| Arsenal | Rodapé esquerdo | Ícones das armas ativas com cooldown animado |
| Contador de mortes | Rodapé direito | Total de inimigos eliminados |
| Barra de Elite | Central topo (aparece só com Elite vivo) | HP do inimigo Elite |

### Tela de Upgrade (pausa o jogo)

Aparece ao subir de nível. Fundo com blur no canvas.

```
╔══════════════════════════════════╗
║      NÍVEL 5 ALCANÇADO!          ║
║   Escolha um upgrade:            ║
║                                  ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ║
║  │ ⚡ Dano+ │ │ 💜 Vida+ │ │ 🌩 Nova  │ ║
║  │  +20%    │ │  +25 HP  │ │  Arma    │ ║
║  └──────────┘ └──────────┘ └──────────┘ ║
╚══════════════════════════════════╝
```

### Tela de Game Over

```
╔══════════════════════════════════╗
║           GAME OVER              ║
║                                  ║
║  ⏱ Sobreviveu:    02:47          ║
║  💀 Mortos:       213            ║
║  ⭐ Nível:        8              ║
║  🗡 Upgrades:     Dano+, Vida+,  ║
║                  Lightning       ║
║                                  ║
║        [ Jogar Novamente ]       ║
╚══════════════════════════════════╝
```

---

## VFX e Feedback Visual

| Evento | Efeito |
|--------|--------|
| Projétil disparado | Trail de partículas na cor da arma |
| Inimigo atingido | Flash branco + números de dano flutuantes |
| Inimigo morto | Burst de partículas + gem aparece |
| Jogador atingido | Screen shake leve + flash vermelho nas bordas |
| Level up | Flash dourado na tela + som de fanfarra |
| Explosão (Nova/Bomber) | Onda circular de partículas + screen shake |
| Elite spawn | Alerta vermelho pulsando no HUD |
| Escudo ativo | Aura azul ao redor do personagem |

---

## Arena

- Mapa **infinito** (câmera segue o personagem)
- Fundo: tilemap de pedra/grama com variações aleatórias
- Sem paredes — inimigos spawnam fora do campo de visão (mínimo 50px além da borda da câmera)
- Paralax leve no fundo para sensação de movimento

---

## Sessão de Jogo Típica

```
00:00 — Começa. Alguns Slimes aparecem. Você mata com facilidade.
00:30 — Bats chegam. Mais rápidos. Você sobe pro nível 3, pega Lightning.
01:00 — Tanks! Um deles te empurra. Você quase morre, pega Vida+.
02:00 — A tela fica cheia de inimigos. Você tenta não ficar encurralado.
03:00 — Um Elite aparece com barra de HP no topo. Foco total nele.
05:00 — Caos. Explosões em todo lugar. Você vai morrer em breve.
07:00 — Game Over. 350 inimigos mortos. Nível 14. Tenta de novo.
```

---

## Arquitetura (resumo técnico)

```
Angular HUD Layer
  ├── HudComponent         (HP, XP, timer, kills)
  ├── UpgradeModalComponent (level-up screen)
  └── GameOverComponent    (results screen)

GameBridgeService (eventos tipados)
  ├── ENGINE → UI: PLAYER_HP_CHANGED, LEVEL_UP, GAME_OVER, ENEMY_KILLED, ELITE_SPAWNED
  └── UI → ENGINE: UPGRADE_SELECTED, RESTART_GAME, PAUSE_TOGGLE

Phaser 3 Scene
  ├── GameScene            (loop principal, ECS, spawn, colisões)
  ├── WeaponSystem         (auto-aim, cooldowns, projéteis)
  ├── EnemySystem          (wave spawner, AI de perseguição)
  ├── XpSystem             (gems, coleta, level up)
  └── VfxSystem            (partículas, screen shake, números flutuantes)
```

---

## Métricas de Sucesso do Teste

Este jogo é um teste da engine. Consideramos sucesso quando:

- [ ] ECS roda estável com 300+ entidades (inimigos + projéteis + gems)
- [ ] Bridge de eventos funciona sem acoplamento Angular↔Phaser
- [ ] HUD Angular atualiza em tempo real sem lag perceptível
- [ ] Tela de upgrade pausa o jogo corretamente e retorna o estado
- [ ] VFX não dropa abaixo de 55 FPS mesmo em modo caos
- [ ] Restart reseta estado completo sem memory leak
