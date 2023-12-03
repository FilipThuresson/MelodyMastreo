require('dotenv').config();
const { Client, IntentsBitField} = require('discord.js');
const {PlayCommand, SkipCommand, StopCommand, PauseCommand, ResumeCommand} = require('./Commands/play.js')

//import { PlayCommand } from './Commands/play.js';



const client = new Client({
    intents:[
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
});

client.on('ready', (c)=>{
    console.log(`INFO> ${c.user.tag} logged in!`)
});

client.on('interactionCreate', (interaction)=>{
    if(!interaction.isChatInputCommand()) return;


    switch(interaction.commandName) {
        case 'play':
            PlayCommand(interaction);
            break;
        case 'skip':
            SkipCommand(interaction);
            break;
        case 'stop':
            StopCommand(interaction);
            break;
        case 'pause':
            PauseCommand(interaction);
            break;
        case 'resume':
            ResumeCommand(interaction);
            break;
        default:
            interaction.reply('Not implemented');
            break;
    }
});

client.login(process.env.TOKEN);