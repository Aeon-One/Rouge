const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const { interactionData } = require('./interactionStore');
const ticketStore = require('./ticketStore');
const { createTicket } = require('./createTicket');

module.exports = {
    name: 'menuHandler',
    description: 'Gerencia as interações com o menu de registro.',

    async handleInteraction(interaction) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'menu_registro') return;

        try {
            const selectedValue = interaction.values[0];
            const guild = interaction.guild;
            const existingTicket = guild.channels.cache.find(channel => channel.name === `ticket-${interaction.user.username}`);

            const menuSelect = new StringSelectMenuBuilder()
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

            const row = new ActionRowBuilder().addComponents(menuSelect);

            await interaction.message.edit({ components: [row] });

            if (existingTicket) {
                await interaction.reply({
                    content: `Você já possui um ticket aberto em ${existingTicket}. Não é possível abrir um novo ticket até que o atual seja fechado.`,
                    ephemeral: true
                });
                return;
            }

            if (selectedValue === 'denuncia' || selectedValue === 'outro') {
                const ticketChannel = await createTicket(interaction, selectedValue);
                if (ticketChannel) {
                    await interaction.message.edit({ 
                        components: [row] 
                    }).catch(() => {});
                }
                return;
            }

            let modalTitle = '';
            switch (selectedValue) {
                case 'member':
                    modalTitle = 'Formulário de Registro - Membro';
                    break;
                case 'visitor':
                    modalTitle = 'Formulário de Registro - Visitante';
                    break;
                case 'partner':
                    modalTitle = 'Formulário de Registro - Parceria';
                    break;
                default:
                    await interaction.reply({ 
                        content: 'Opção inválida.', 
                        ephemeral: true 
                    });
                    return;
            }

            interactionData.set(interaction.user.id, { registrationType: selectedValue });

            const modal = new ModalBuilder()
                .setCustomId('register_form')
                .setTitle(modalTitle);

            const usernameInput = new TextInputBuilder()
                .setCustomId('roblox_username')
                .setLabel('Username do Roblox:')
                .setPlaceholder('Digite seu username do Roblox')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const ageInput = new TextInputBuilder()
                .setCustomId('age')
                .setLabel('Idade:')
                .setPlaceholder('Digite sua idade')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const genderInput = new TextInputBuilder()
                .setCustomId('gender')
                .setLabel('Gênero:')
                .setPlaceholder('Digite seu gênero')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const invitedByInput = new TextInputBuilder()
                .setCustomId('invited_by')
                .setLabel('Convidado por:')
                .setPlaceholder('Quem o convidou?')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Razão para entrar:')
                .setPlaceholder('Por que deseja se registrar?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(usernameInput),
                new ActionRowBuilder().addComponents(ageInput),
                new ActionRowBuilder().addComponents(genderInput),
                new ActionRowBuilder().addComponents(invitedByInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            await interaction.showModal(modal);
            await interaction.message.edit({ 
                components: [row] 
            }).catch(() => {});

        } catch (error) {
            console.error('Erro ao processar interação do menu:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Ocorreu um erro ao processar sua solicitação.', 
                    ephemeral: true 
                });
            }
        }
    }
};