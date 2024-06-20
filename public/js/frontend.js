// Vybrání canvas elementu a získání 2D kontextu
const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

// Inicializace socketu
const socket = io()

// Vybrání elementu pro zobrazení skóre
const scoreEl = document.querySelector('#scoreEl')

// Získání poměru pixelů zařízení
const devicePixelRatio = window.devicePixelRatio || 1

// Nastavení šířky a výšky canvasu
canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

// Výpočet středu canvasu
const x = canvas.width / 2
const y = canvas.height / 2

// Inicializace objektů pro hráče a projektily
const frontEndPlayers = {}
const frontEndProjectiles = {}

// Po připojení k socketu inicializace canvasu na serveru
socket.on('connect', () => {
  socket.emit('initCanvas', {
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio
  })
})

// Aktualizace projektilů na základě dat ze serveru
socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    // Přidání nového projektilu, pokud neexistuje
    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity
      })
    } else {
      // Aktualizace pozice stávajícího projektilu
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    }
  }

  // Odstranění projektilů, které již nejsou na serveru
  for (const frontEndProjectileId in frontEndProjectiles) {
    if (!backEndProjectiles[frontEndProjectileId]) {
      delete frontEndProjectiles[frontEndProjectileId]
    }
  }
})

// Aktualizace hráčů na základě dat ze serveru
socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]

    // Přidání nového hráče, pokud neexistuje
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color
      })
    } else {
      if (id === socket.id) {
        // Aktualizace pozice vlastního hráče
        frontEndPlayers[id].x = backEndPlayer.x
        frontEndPlayers[id].y = backEndPlayer.y

        // anti lag pro ostatni hrace pri vysoke latenci
        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)

        playerInputs.forEach((input) => {
          frontEndPlayers[id].x += input.dx
          frontEndPlayers[id].y += input.dy
        })
      } else {
        // Aktualizace pozice ostatních hráčů
        gsap.to(frontEndPlayers[id], {
          x: backEndPlayer.x,
          y: backEndPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      }
    }
  }

  // Odstranění hráčů, kteří již nejsou na serveru
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      delete frontEndPlayers[id]
    }
  }
})

// Funkce pro animaci canvasu
let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  // Kreslení všech hráčů
  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id]
    frontEndPlayer.draw()
  }

  // Kreslení všech projektilů
  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id]
    frontEndProjectile.draw()
  }

  // // Aktualizace všech projektilů (zakomentováno)
  // for (let i = frontEndProjectiles.length - 1; i >= 0; i--) {
  //   const frontEndProjectile = frontEndProjectiles[i]
  //   frontEndProjectile.update()
  // }
}

// Spuštění animace
animate()

// Inicializace kláves
const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

// Nastavení rychlosti pohybu hráče
const SPEED = 10
// Pole pro ukládání vstupů hráče
const playerInputs = []
let sequenceNumber = 0

// Nastavení intervalu pro odesílání vstupů hráče na server
//sequenceNumber je cislo posledniho odeslaneho vstupu pro synchronnizaci s serverem
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED })
    frontEndPlayers[socket.id].y -= SPEED
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }

  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 })
    frontEndPlayers[socket.id].x -= SPEED
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }

  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED })
    frontEndPlayers[socket.id].y += SPEED
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }

  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 })
    frontEndPlayers[socket.id].x += SPEED
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

// Přidání posluchače událostí pro stisk kláves
window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break

    case 'KeyA':
      keys.a.pressed = true
      break

    case 'KeyS':
      keys.s.pressed = true
      break

    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

// Přidání posluchače událostí pro uvolnění kláves
window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break

    case 'KeyA':
      keys.a.pressed = false
      break

    case 'KeyS':
      keys.s.pressed = false
      break

    case 'KeyD':
      keys.d.pressed = false
      break
  }
})