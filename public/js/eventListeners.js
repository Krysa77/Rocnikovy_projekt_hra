// Přidání eventListeneru pro kliknutí myši
addEventListener('click', (event) => {
  // Získání pozice hráče z frontEndPlayers pomocí socket.id
  const playerPosition = {
    x: frontEndPlayers[socket.id].x,
    y: frontEndPlayers[socket.id].y
  }

  // Výpočet úhlu mezi pozicí hráče a místem kliknutí
  const angle = Math.atan2(
    event.clientY * window.devicePixelRatio - playerPosition.y,
    event.clientX * window.devicePixelRatio - playerPosition.x
  )

  // const velocity = {
  //   x: Math.cos(angle) * 5,
  //   y: Math.sin(angle) * 5
  // }

  // Odeslání informace o střelbě na server
  socket.emit('shoot', {
    x: playerPosition.x,
    y: playerPosition.y,
    angle
  })
  // frontEndProjectiles.push(
  //   new Projectile({
  //     x: playerPosition.x,
  //     y: playerPosition.y,
  //     radius: 5,
  //     color: 'white',
  //     velocity
  //   })
  // )

  // Výpis frontEndProjectiles do konzole pro debugování
  console.log(frontEndProjectiles)
})