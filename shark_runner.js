let game;

let game_options {
    platform_speed: [300, 300],
    platform_spawn_range: [80, 300],
    platform_width: [-5, 5],
    platform_height: [90, 300],
    platform_width_scale: 20,
    platform_horizontal_limit: [0.4, 0.8],
    trash_percent: 25

}

window.onload = function() {

    // object containing configuration options
    let gameConfig = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: 0x0c88c7,

        // physics settings
        physics: {
            default: "arcade"
        }
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
}

class preloadGame extends Phaser.Scene{
    constructor(){
        super("PreloadGame");
    }

    preload() {
        this.load.image('sky', 'assets/bg1.png');
        this.load.image('ground', 'assets/platform1.png');
        this.load.image('fish', 'assets/Fish3_1.png');
        this.load.image('trash', 'assets/Fish3_1.png');
        this.load.image('bomb', 'assets/bomb.png');
        this.load.spritesheet('dude', 'assets/Shark_Merge.png', { frameWidth: 98, frameHeight: 48 });
    }

    create() {
        this.anims.create({
            key: 'flip',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });

        this.scene.start("PlayGame");
    }

};

class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }


    create() {
        this.platform_group = this.add.group({
            removeCallback: function(platform){
                platform.scene.platform_pool.add(platform)
            }
        });

        this.platform_pool = this.add.group({
            removeCallback: function(platform){
                platform.scene.platform_group.add(platform)
            }
        });

        this.trash_group = this.add.group({
            removeCallback: function(trash){
                trash.scene.trash_pool.add(trash)
            }
        });

        this.trash_pool = this.add.group({
            removeCallback: function(trash){
                trash.scene.trash_group.add(trash)
            }
        });

        this.added_platforms = 0;
        this.addPlatform(game.config.width * game_options.platform_horizontal_limit[1], game.config.width / 2, game.config.height);

        // The player and its settings
        this.player = this.physics.add.sprite(100, 450, 'dude');

        //  Player physics properties. Give the little guy a slight bounce.
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(2);


        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function(){

            // play "run" animation if the player is on a platform
            if(!this.player.anims.isPlaying){
                this.player.anims.play("flip");
            }
        }, null, this);

        this.physics.add.collider(player, fish, collectStar, null, this);

        this.physics.add.overlap(this.player, this.trash_group, function(player, trash){

            this.tweens.add({
                targets: trash,
                y: trash.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function(){
                    this.trash_group.killAndHide(trash);
                    this.trash_group.remove(trash);
                }
            });
            score += 10;
            scoreText.setText('Score: ' + score);

        }, null, this);

    }

    addPlatform(platformWidth, posX, posY){
        this.added_platforms ++;
        let platform;
        if(this.platform_pool.getLength()){
            platform = this.platform_pool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platform_pool.remove(platform);
            let newRatio =  platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else{
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "ground");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(game_options.platform_speed_range[0], game_options.platform_speed_range[1]) * -1);
            platform.setDepth(2);
            this.platform_group.add(platform);
        }
        this.nextPlatformDistance = Phaser.Math.Between(game_options.platform_spawn_range[0], game_options.platform_spawn_range[1]);

        // if this is not the starting platform...
        if(this.addedPlatforms > 1){

            // is there trash beside the platform?
            if(Phaser.Math.Between(1, 100) <= game_options.trash_percent){
                if(this.trash_pool.getLength()){
                    let trash = this.trash_pool.getFirst();
                    trash.x = posX;
                    trash.y = posY - 96;
                    trash.alpha = 1;
                    trash.active = true;
                    trash.visible = true;
                    this.trash_pool.remove(trash);
                }
                else{
                    let trash = this.physics.add.sprite(posX, posY - 96, "trash");
                    trash.setImmovable(true);
                    trash.setVelocityX(platform.body.velocity.x);
                    trash.setDepth(2);
                    this.trashGroup.add(trash);
                }
            }
        }
    }

    update() {

        // Game over condition:
        // if (this.player ... ) { this.scene.start("PlayGame"); }

        // recycling platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if(platformDistance < minDistance){
                minDistance = platformDistance;
                rightmostPlatformHeight = platform.y;
            }
            if(platform.x < - platform.displayWidth / 2){
                this.platform_group.killAndHide(platform);
                this.platform_group.remove(platform);
            }
        }, this);

        // recycling trash items
        this.trash_group.getChildren().forEach(function(trash){
            if(trash.x < - trash.displayWidth / 2){
                this.trash_group.killAndHide(trash);
                this.trash_group.remove(trash);
            }
        }, this);

        // adding new platforms
        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(game_options.platform_width[0], game_options.platform_width[1]);
            let platformRandomHeight = game_options.platform_width_scale * Phaser.Math.Between(game_options.platform_height[0], game_options.platform_height[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * game_options.platform_horizontal_limit[0];
            let maxPlatformHeight = game.config.height * game_options.platform_horizontal_limit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }

    }
};

function resize(){
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}
