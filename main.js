const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();
client.eventCommands = new Collection();

function loadSlashCommands(dir) {
    const commands = [];
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        const filePath = path.resolve(dir, file);
        const command = require(filePath);
        if (command.data && typeof command.execute === 'function') {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        }
    }
    return commands;
}

function loadCommands(dir, collection) {
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        const filePath = path.resolve(dir, file);
        const command = require(filePath);
        collection.set(command.name, command);
    }
}

const slashCommands = loadSlashCommands('./commands');
loadCommands('./events', client.eventCommands);

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: slashCommands }
        );

    } catch (error) {
        console.error('Erro ao registrar comandos de barra:', error);
    }
}

client.once('ready', () => {
    console.log(`Bot iniciado como ${client.user.tag}!`);
    registerCommands();
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) {
        return;
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        await message.reply('Houve um erro ao executar este comando!');
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Houve um erro ao executar este comando!',
                    ephemeral: true
                });
            }
        }

        const menuHandler = client.eventCommands.get('menuHandler');
        if (menuHandler && typeof menuHandler.handleInteraction === 'function') {
            await menuHandler.handleInteraction(interaction);
        }

        if (interaction.isButton()) {
            const verifyCommand = client.eventCommands.get('verify');
            if (verifyCommand && typeof verifyCommand.handleButtonInteraction === 'function') {
                await verifyCommand.handleButtonInteraction(interaction);
            }

            const ticketsCommand = client.eventCommands.get('createTicket');
            if (ticketsCommand && typeof ticketsCommand.handleInteraction === 'function') {
                await ticketsCommand.handleInteraction(interaction);
            }
        }

        if (interaction.isModalSubmit()) {
            const verifyCommand = client.eventCommands.get('verify');
            if (verifyCommand && typeof verifyCommand.handleModalSubmit === 'function') {
                await verifyCommand.handleModalSubmit(interaction);
            }

            const registerFormHandler = client.eventCommands.get('registerForm');
            if (registerFormHandler && typeof registerFormHandler.handleInteraction === 'function') {
                await registerFormHandler.handleInteraction(interaction);
            }

            const ticketsCommand = client.eventCommands.get('createTicket');
            if (ticketsCommand && typeof ticketsCommand.handleTicketCreation === 'function') {
                await ticketsCommand.handleTicketCreation(interaction);
            }
        }
    } catch (error) {
        console.error('Erro ao processar interação:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Houve um erro ao processar sua interação!',
                    ephemeral: true
                });
            }
        } catch (err) {
            console.error('Erro ao enviar mensagem de erro:', err);
        }
    }
});

client.login(process.env.TOKEN);