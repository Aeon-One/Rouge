const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setticket')
        .setDescription('Envia uma mensagem para criação de tickets.'),

    async execute(interaction) {
        try {
            if (interaction.user.id !== config.botOwnerId || interaction.channel.id !== config.ticketConfig.allowedChannelId) {
                return interaction.reply();
            }

            const embed = new EmbedBuilder()
            .setColor(0x00AAFF)
            .setTitle('Ticket')
            .setDescription('Escolha uma das opções abaixo para criar um ticket.ㅤㅤㅤㅤ');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('menu_registro')
                .setPlaceholder('Selecione sua opção...')
                .addOptions(
                    {
                        label: 'Membro',
                        value: 'member',
                        description: 'Entre como membro no clã.',
                        emoji: { id: '1325077686413955142', name: 'ClMember' }
                    },
                    {
                        label: 'Visitante',
                        value: 'visitor',
                        description: 'Entre como visitante no clã.',
                        emoji: { id: '1325087745219236002', name: 'Visitors' }
                    },
                    {
                        label: 'Parceria',
                        value: 'partner',
                        description: 'Forme parceria com o clã.',
                        emoji: { id: '1325083016179093614', name: 'Partner' }
                    },
                    {
                        label: 'Denúncia',
                        value: 'denuncia',
                        description: 'Registre uma denúncia.',
                        emoji: '📢'
                    },
                    {
                        label: 'Outro',
                        value: 'outro',
                        description: 'Outros assuntos.',
                        emoji: '🛠️'
                    }
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Erro ao executar o comando setticket:', error);
        }
    },
};