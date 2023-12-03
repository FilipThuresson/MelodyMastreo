require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType} = require('discord.js');

const commands = [
    {
        name: 'play',
        description: 'Plays the given URL',
        options: [
            {
                name: 'url',
                description: 'URL to the song',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ]
    },
    {
        name: 'skip',
        description: 'skips the current song',
    },
    {
        name: 'stop',
        description: 'Stop the current song and empty the queue',
    },
    {
        name: 'pause',
        description: 'Pauses the player',
    },
    {
        name: 'resume',
        description: 'Resumes the player',
    }
];

const rest = new REST({version: '10'}).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Register slash commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            {body: commands},
        );

        console.log('Finished registering slash commands...');

    } catch(error) {
        console.error(`There was an error: ${error}`);
    }
})();