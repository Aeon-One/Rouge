const { SlashCommandBuilder } = require('discord.js');
const { botOwnerId } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stoptest')
        .setDescription('Finaliza o teste.'),

    async execute(interaction) {

        if (interaction.user.id !== botOwnerId) {
            await interaction.reply({ content: 'Apenas o Aeon pode usar este comando.', ephemeral: true });
            return;
        }

        try {
            await interaction.reply('Test: D++, `events/welcomeGeneralChat.c++` finished!');
        } catch (error) {
            console.error('Erro ao finalizar o teste:', error);
            await interaction.reply({ content: 'Ocorreu um erro ao finalizar o teste.', ephemeral: true });
        }
    }
};