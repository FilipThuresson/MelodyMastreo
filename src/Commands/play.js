const { 
    createAudioPlayer, 
    createAudioResource, 
    joinVoiceChannel, 
    NoSubscriberBehavior, 
    AudioPlayerStatus, 
    getVoiceConnection 
} = require('@discordjs/voice');
const play = require('play-dl');

// SoundCloud setup
play.getFreeClientID().then((clientID) => {
    play.setToken({
        soundcloud : {
            client_id : clientID
        }
    })
});

// Global server queue object
var servers = {};

/**
 * Plays the next song in the queue for a given guild.
 * This function is called by PlayCommand (to start) and the player's 'Idle' event (to continue).
 */
async function playfunc(interaction) {
    
    let guildId = interaction.guild.id;
    let server = servers[guildId];

    // 1. Check if queue is empty
    if (server.queue.length === 0) {
        server.isPlaying = false; // Set flag
        // Optional: Leave after a 1-minute delay
        setTimeout(() => { 
            // Check again in case a song was added during the timeout
            if (server && server.queue.length === 0) { 
                getVoiceConnection(guildId)?.destroy();
                server.player?.stop();
                delete servers[guildId]; // Clean up server object
            }
        }, 60000); // 1 minute
        return;
    }

    // 2. Get the *next* song URL
    const songUrl = server.queue.shift();
    console.log(songUrl);
    
    try {
        // 3. Get stream and resource
        let stream = await play.stream(songUrl);
        let resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });
        
        // 4. Play the resource on the *existing* player
        server.player.play(resource);

    } catch (error) {
        // 5. Use .followUp() for errors (since we already replied)
        await interaction.followUp({ 
            content: `Error: Could not play song. Skipping.`, 
            flags: 64 // Replaces deprecated 'ephemeral: true'
        });
        console.log(error);

        // 6. Call playfunc again to try the NEXT song in the queue
        playfunc(interaction);
    }
}

/**
 * Handles the /play command.
 * Adds a song to the queue and starts the player if it's not already running.
 */
async function PlayCommand(interaction) {

    // Check if user is in a VC
    if (!interaction.member.voice.channel) {
        interaction.reply({ content: 'You must be in a voice channel!', flags: 64 });
        return;
    }

    let guildId = interaction.guild.id;
    let channelId = interaction.member.voice.channel.id;

    // 1. Initialize server object if this is the first song
    if (!servers[guildId]) {
        servers[guildId] = {
            queue: [],
            isPlaying: false,
            player: null,    // Will hold the AudioPlayer
            connection: null // Will hold the VoiceConnection
        };
    }

    var server = servers[guildId];
    const url = interaction.options.get('url').value;
    
    // 2. Add song to queue
    console.log(url)
    server.queue.push(url);

    // 3. Reply to the interaction immediately
    await interaction.reply(`Added to the queue.\nTotal Songs in Queue: ${server.queue.length}\n${url} `);

    // 4. Only start player if it's not already playing
    if (!server.isPlaying) { 
        
        server.isPlaying = true;

        // Get or create connection and store it
        let connection = getVoiceConnection(guildId);
        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channelId,
                guildId: guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
        }
        server.connection = connection;

        // --- Create Player and Listeners (Only ONCE) ---
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });
        server.player = player; // Store the player
        connection.subscribe(player);

        // Player 'Idle' listener (when a song finishes)
        player.on(AudioPlayerStatus.Idle, () => {
            // Song finished, call playfunc to play the next one
            playfunc(interaction);
        });

        // Player error listener
        player.on('error', error => {
            console.error(`AudioPlayer Error: ${error.message}`);
            interaction.followUp({ content: 'A player error occurred, skipping to next song.', flags: 64 });
            playfunc(interaction);
        });
        // --- End Setup ---

        // 5. Call playfunc to play the *first* song
        playfunc(interaction);
    }
    // If isPlaying is true, do nothing. The 'Idle' listener will
    // automatically pick up this new song when the current one finishes.
}

/**
 * Handles the /skip command.
 */
function SkipCommand(interaction) {
    if (!interaction.member.voice.channel) {
        interaction.reply({ content: 'You must be in a voice channel!', flags: 64 });
        return;
    }

    let guildId = interaction.guild.id;
    var server = servers[guildId];

    // Safety check: Make sure a player exists
    if (!server || !server.player) {
        interaction.reply({ content: 'Nothing is playing!', flags: 64 });
        return;
    }

    // Stop the player. This triggers the 'Idle' event,
    // which will automatically call playfunc to start the next song.
    server.player.stop();

    interaction.reply('Skipped the song');
}

/**
 * Handles the /stop command.
 */
function StopCommand(interaction) {
    if (!interaction.member.voice.channel) {
        interaction.reply({ content: 'You must be in a voice channel!', flags: 64 });
        return;
    }

    let guildId = interaction.guild.id;
    var server = servers[guildId];

    // Safety check
    if (!server || !server.player) {
        interaction.reply({ content: 'Nothing is playing!', flags: 64 });
        return;
    }

    // Clear the queue
    server.queue = [];
    
    // Stop the player. This triggers 'Idle', which calls playfunc.
    // playfunc will see the queue is empty and trigger the disconnect logic.
    server.player.stop();

    interaction.reply('Emptied the queue and stopped the player.');
}

/**
 * Handles the /pause command.
 */
function PauseCommand(interaction) {
    if (!interaction.member.voice.channel) {
        interaction.reply({ content: 'You must be in a voice channel!', flags: 64 });
        return;
    }

    let guildId = interaction.guild.id;
    var server = servers[guildId];

    // Safety check
    if (!server || !server.player) {
        interaction.reply({ content: 'Nothing is playing!', flags: 64 });
        return;
    }

    // Attempt to pause and reply with success
    const success = server.player.pause();
    interaction.reply(success ? 'Paused.' : 'Could not pause player.');
}

/**
 * Handles the /resume command.
 */
function ResumeCommand(interaction) {
    if (!interaction.member.voice.channel) {
        interaction.reply({ content: 'You must be in a voice channel!', flags: 64 });
        return;
    }

    let guildId = interaction.guild.id;
    var server = servers[guildId];

    // Safety check
    if (!server || !server.player) {
        interaction.reply({ content: 'Nothing is playing!', flags: 64 });
        return;
    }

    // Attempt to unpause and reply with success
    const success = server.player.unpause();
    interaction.reply(success ? 'Resumed.' : 'Could not resume player.');
}

module.exports = {
    PlayCommand, 
    SkipCommand, 
    StopCommand, 
    PauseCommand, 
    ResumeCommand
};