const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setverify')
        .setDescription('Inicia a verificação de TAG do clã no Roblox'),

    async execute(interaction) {

        if (interaction.user.id !== config.botOwnerId) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Verificação de TAG')
            .setDescription('Para fazer a verificação da sua TAG do clã no Roblox, aperte em **Iniciar**.')
            .addFields(
                {
                    name: 'Obs:',
                    value: 'Adicione o seu **username** sem o **@**.\nExemplo: `Roblox`',
                }
            )
            .setImage('https://i.ibb.co/Dk3MbsL/example.png');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Iniciar')
                .setStyle('Primary')
                .setDisabled(false)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};