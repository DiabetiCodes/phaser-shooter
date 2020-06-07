class Scene2 extends Phaser.Scene {
  constructor() {
    super("playGame");
  }

  create() {
    this.background = this.add.tileSprite(0, 0, config.width, config.height, "background");
    this.background.setOrigin(0, 0);

    var graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(0,0);
    graphics.lineTo(config.width, 0);
    graphics.lineTo(config.width, 20);
    graphics.lineTo(0, 20);
    graphics.lineTo(0,0);
    graphics.closePath();
    graphics.fillPath();

    this.score = 0;
    this.scoreLabel = this.add.bitmapText(10, 5, 'pixelFont', 'SCORE:', 16);

    this.ship1 = this.add.sprite(config.width / 2 - 50, config.height / 2, "ship");
    this.ship2 = this.add.sprite(config.width / 2, config.height / 2, "ship2");
    this.ship3 = this.add.sprite(config.width / 2 + 50, config.height / 2, "ship3");

    this.enemies = this.physics.add.group();
    this.enemies.add(this.ship1);
    this.enemies.add(this.ship2);
    this.enemies.add(this.ship3);

    this.ship1.play("ship1_anim");
    this.ship2.play("ship2_anim");
    this.ship3.play("ship3_anim");

    this.ship1.setInteractive();
    this.ship2.setInteractive();
    this.ship3.setInteractive();

    this.input.on('gameobjectdown', this.destroyShip, this);

    this.physics.world.setBoundsCollision();
    this.powerUps = this.physics.add.group();

    for (var i = 0; i < gameSettings.maxPowerups; i++) {
      var powerUp = this.physics.add.sprite(16, 16, "power-up");
      this.powerUps.add(powerUp);
       powerUp.setRandomPosition(0, 0, game.config.width, game.config.height);

      if (Math.random() > 0.5) {
        powerUp.play("red");
      } else {
        powerUp.play("gray");
      }

      powerUp.setVelocity(gameSettings.powerUpVel, gameSettings.powerUpVel);
      powerUp.setCollideWorldBounds(true);
      powerUp.setBounce(1);
    }

    // 2.1 ADD THE PLAYER SHIP
    this.player = this.physics.add.sprite(config.width / 2 - 8, config.height - 64, "player");
    this.player.play("thrust");
    // 2.2 create the cursorKeys
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    // 3.3 don't let the player leave the screen
    this.player.setCollideWorldBounds(true);

    // 4.1  add a key for the player fire
    this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.projectiles = this.add.group();

    //Checks collision between projectiles and powerups, destroys projectile when collision occurs. 
    this.physics.add.collider(this.projectiles, this.powerUps, function(projectile, powerup){
      projectile.destroy();
    });

    //Overlap calculates when 2 objects are touching without simulating physics between them.
    //The first 2 parameters are objects we check for collision on
    //The 3rd parameter is the 'callback function'
    //The last 2 parameters are for the scope of the function
    this.physics.add.overlap(this.player, this.powerUps, this.pickPowerUp, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hurtPlayer, null, this);
    this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy, null, this);
  }

  pickPowerUp(player, powerUp){
    powerUp.disableBody(true, true);    //Sets powerup touched to inactive and removes it from game
  };

  hurtPlayer(player, enemy){
    this.resetShipPos(enemy);

    if(this.player.alpha < 1){
      return;
    }

    var explosion = new Explosion(this, player.x, player.y);
    player.disableBody(true, true);

    this.time.addEvent({
      delay: 1000,
      callback: this.resetPlayer,
      callbackScope: this,
      loop: false
    });
  }

  hitEnemy(projectile, enemy){
    var explosion = new Explosion(this, enemy.x, enemy.y);
    var scoreFormatted = this.zeroPad(this.score, 6);

    projectile.destroy();

    this.resetShipPos(enemy);
    this.score += 15;
    this.scoreLabel.text = 'SCORE: ' + scoreFormatted;
  }

  update() {
    this.moveShip(this.ship1, 1);
    this.moveShip(this.ship2, 2);
    this.moveShip(this.ship3, 3);
    // this.ship1.alpha = 0;
    // this.ship2.alpha = 0;
    // this.ship3.alpha = 0;

    this.background.tilePositionY -= 0.5;

    // 3.1 call control player
    this.movePlayerManager();

    // 4.2 Event for the player shooting, just once per key pressing
    if(Phaser.Input.Keyboard.JustDown(this.spacebar)){
      this.shootBeam();;
    }

    for(var i = 0; i < this.projectiles.getChildren().length; i++){
      var beam = this.projectiles.getChildren()[i];
      beam.update();
    }

    if(Phaser.Input.Keyboard.JustDown(this.spacebar)){
      if(this.player.active){
        this.shootBeam();
      }
    }
  }

  // 2.2 create the shootBeam function
  shootBeam(){
    // 4.2 add the beam to the group
    var beam = new Beam(this);
  }

  // 3.2 define control player
  movePlayerManager(){
    this.player.setVelocity(0);

    if(this.cursorKeys.left.isDown){
      this.player.setVelocityX(-gameSettings.playerSpeed);
    }else if(this.cursorKeys.right.isDown){
      this.player.setVelocityX(gameSettings.playerSpeed);
    }

    if(this.cursorKeys.up.isDown){
      this.player.setVelocityY(-gameSettings.playerSpeed);
    }else if(this.cursorKeys.down.isDown){
      this.player.setVelocityY(gameSettings.playerSpeed);
    }
  }

  moveShip(ship, speed) {
    ship.y += speed;
    if (ship.y > config.height) {
      this.resetShipPos(ship);
    }
  }

  resetShipPos(ship) {
    ship.y = 0;
    var randomX = Phaser.Math.Between(0, config.width);
    ship.x = randomX;
  }

  resetPlayer(){
    var x = config.width / 2-8;
    var y = config.height + 64;
    this.player.enableBody(true, x, y, true, true);

    this.player.alpha = 0.5;

    var tween = this.tweens.add({
      targets: this.player,
      y: config.height - 64,
      ease: 'Power1',
      duration: 1500,
      repeat: 0,
      onComplete: function(){
        this.player.alpha = 1;
      },
      callbackScope: this
    });
  }

  destroyShip(pointer, gameObject) {
    gameObject.setTexture("explosion");
    gameObject.play("explode");
  }

  zeroPad(number, size){
    var stringNumber = String(number);
    while(stringNumber.length < (size || 2)){
      stringNumber = '0' + stringNumber;
    }
    return stringNumber;
  }
}