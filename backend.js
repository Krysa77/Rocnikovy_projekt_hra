//inicializace expressu
const express = require('express')
const app = express()

// Nastavení socket.io
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })
//naslouchani na portu 3000
const port = 3000

// Používáme statické soubory z adresáře 'public'
app.use(express.static('public'))

// Když je požadavek na root ("/"), pošle se soubor index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

// Skladování informací o hráčích a střelách na backendu v objektech
const backEndPlayers = {}
const backEndProjectiles = {}

const SPEED = 10 // Rychlost pohybu hráče
const RADIUS = 10 // Poloměr hráče
const PROJECTILE_RADIUS = 5 // Poloměr střely
let projectileId = 0 // ID pro střely

// Když se uživatel připojí
io.on('connection', (socket) => {
  console.log('a user connected')
  // Přidání nového hráče s náhodnou pozicí a barvou
  backEndPlayers[socket.id] = {
    x: 500 * Math.random(),
    y: 500 * Math.random(),
    color: `hsl(${360 * Math.random()}, 100%, 50%)`,
    sequenceNumber: 0
  }

  // Aktualizace všech hráčů
  io.emit('updatePlayers', backEndPlayers)

  // Inicializace plátna
  socket.on('initCanvas', ({ width, height, devicePixelRatio }) => {
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }
    
    // Nastavení poloměru hráče podle obrazu uzivatelskeho zarizeni
    backEndPlayers[socket.id].radius = RADIUS

    if (devicePixelRatio > 1) {
      backEndPlayers[socket.id].radius = 2 * RADIUS
    }
  })

  // Když hráč vystřelí
  socket.on('shoot', ({ x, y, angle }) => {
    //id strely
    projectileId++
    //vypocet rychlosti strely a jeji smer
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }

    //objekt strely s jejim id, souradnicemi, rychlosti a id hrace
    backEndProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id
    }

    console.log(backEndProjectiles)
  })

  // Když se uživatel odpojí
  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]
    io.emit('updatePlayers', backEndPlayers)
  })

  // Když hráč stiskne klávesu pro pohyb
  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED
        break

      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED
        break

      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED
        break

      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED
        break
    }
  })
})

// Backend ticker pro aktualizaci stavu hry
setInterval(() => {
  // Aktualizace pozic střel
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

    // Kontrola, zda střela není mimo plátno
    const PROJECTILE_RADIUS = 5
    if (
      backEndProjectiles[id].x - PROJECTILE_RADIUS >=
        backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
      backEndProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS >=
        backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id]
      continue
    }

    // Kontrola kolize střely s hráčem
    for (const playerId in backEndPlayers) {  // Procházení všech hráčů na backendu
      const backEndPlayer = backEndPlayers[playerId]  // Načtení aktuálního hráče

      // Výpočet vzdálenosti mezi střelou a hráčem pomocí Pythagorovy věty
      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      )

      // Kontrola kolize střely s hráčem
      if (
        DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
        backEndProjectiles[id].playerId !== playerId
      ) {
        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break
      }
    }
  }

  // Poslání aktualizovaných stavů střel a hráčů na frontend
  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 15)

// Spuštění serveru na zvoleném portu
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

console.log('server did load')
