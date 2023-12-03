const { createAudioPlayer, createAudioResource , StreamType, demuxProbe, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection  } = require('@discordjs/voice');

const play = require('play-dl');

play.getFreeClientID().then((clientID) => {
    play.setToken({
      soundcloud : {
          client_id : clientID
      }
    })
});

var servers = {};


async function playfunc(connection, interaction) {
    
    let guildId = interaction.guild.id;
    let server = servers[guildId];

    if(server.queue[0]) {
        try {
            let stream = await play.stream(server.queue[0]);
            
            let resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            server.queue.shift();
            let player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            });

            server.player = player;
        
            player.play(resource);
        
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, ()=>{
                if(server.queue[0]){
                    playfunc(connection, interaction);
                } else {
                    setTimeout(()=>{connection.destroy()}, 1000);
                    return;
                }
            });

        } catch (error) {
            interaction.reply({content:'Error possibly wrong url', ephemeral: true});
            console.log(error);
        }
    }
}

async function PlayCommand(interaction) {


    if(!interaction.member.voice.channel) {
        interaction.reply({content:'You must be in a voice channel!', ephemeral: true});
        return;
    }

    let guildId = interaction.guild.id;
    let channelId = interaction.member.voice.channel.id;

    if(!servers[guildId]) servers[guildId] = {
        queue: []
    };

    var server = servers[guildId];

    const url = interaction.options.get('url').value;
    
    server.queue.push(url);

    interaction.reply(`Added to the queue.\nTotal Songs in Queue: ${server.queue.length}\n${url} `);

    const connection = getVoiceConnection(guildId);
    
    if (!connection) {
        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        playfunc(connection, interaction);
    } 
}

function SkipCommand(interaction) {
    if(!interaction.member.voice.channel) {
        interaction.reply({content:'You must be in a voice channel!', ephemeral: true});
        return;
    }

    let guildId = interaction.guild.id;

    if(!servers[guildId]) return;
    var server = servers[guildId];

    server.player.stop();

    interaction.reply('Skipped the song');
}

function StopCommand(interaction) {
    if(!interaction.member.voice.channel) {
        interaction.reply({content:'You must be in a voice channel!', ephemeral: true});
        return;
    }

    let guildId = interaction.guild.id;

    if(!servers[guildId]) return;
    var server = servers[guildId];

    server.queue = [];
    server.player.stop();

    interaction.reply('Emptied The queue');
}

function PauseCommand(interaction) {
    if(!interaction.member.voice.channel) {
        interaction.reply({content:'You must be in a voice channel!', ephemeral: true});
        return;
    }

    let guildId = interaction.guild.id;

    if(!servers[guildId]) return;
    var server = servers[guildId];

    server.player.pause();

    interaction.reply('Paused');
}

function ResumeCommand(interaction) {
    if(!interaction.member.voice.channel) {
        interaction.reply({content:'You must be in a voice channel!', ephemeral: true});
        return;
    }

    let guildId = interaction.guild.id;

    if(!servers[guildId]) return;
    var server = servers[guildId];

    server.player.unpause();

    interaction.reply('Resumed');
}

module.exports = {PlayCommand, SkipCommand, StopCommand, PauseCommand, ResumeCommand};