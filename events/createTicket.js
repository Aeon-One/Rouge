const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const moment = require('moment');
const { interactionData } = require('./interactionStore');
const ticketStore = require('./ticketStore');
const path = require('path');
const fs = require('fs');
const config = require('../config.json');

module.exports = {
    name: 'createTicket',
    description: 'Cria um canal de ticket para o usuário após o envio do formulário.',

    async createTicket(interaction, ticketType, username = '') {
        const guild = interaction.guild;
        const userId = interaction.user.id;

        try {
            const ticketCategory = guild.channels.cache.get(config.ticketConfig.categoryId);

            if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
                throw new Error('Categoria de tickets não encontrada ou inválida.');
            }

            const ticketChannel = await guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: ticketCategory,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone (todos os usuários)
                        deny: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                        ],
                    },
                    {
                        id: interaction.user.id, // Usuário que abriu o ticket
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                        ],
                        deny: [
                            PermissionsBitField.Flags.CreateInstantInvite,
                        ],
                    },
                    {
                        id: config.staffRoleId, // Cargo da staff
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, // Permitir visualização do canal
                            PermissionsBitField.Flags.SendMessages, // Permitir enviar mensagens
                        ],
                        deny: [
                            PermissionsBitField.Flags.ManageChannels, // Negar gerenciamento de canais
                            PermissionsBitField.Flags.ManageRoles, // Negar gerenciamento de cargos
                            PermissionsBitField.Flags.CreateInstantInvite, // Negar criação de convites
                        ],
                    },
                ],
            });

            const registrationTypeMap = {
                'member': 'Membro <:ClMember:1325077686413955142>',
                'visitor': 'Visitante <:Visitors:1325087745219236002>',
                'partner': 'Parceria <:Partner:1325083016179093614>',
                'denuncia': 'Denúncia 📢',
                'outro': 'Outros Assuntos 🛠️',
            };

            const translatedRegistrationType = registrationTypeMap[ticketType];

            const userMention = `<@${interaction.user.id}>`;
            const embed = new EmbedBuilder()
                .setColor(0x00AAFF)
                .setTitle(translatedRegistrationType ? `Ticket de Registro - ${translatedRegistrationType}` : 'Ticket de Registro')
                .setThumbnail('https://i.ibb.co/89mmXGf/ticket.png')
                .setDescription(`**Aberto por:** ${userMention}\n**ID:** ${interaction.user.id}\n**Ticket:** ${ticketChannel}`)
                .addFields({
                    name: 'Seja bem-vindo(a) ao ticket de registro.',
                    value: 'Nossa equipe estará disponível para atendê-lo(a) em breve. O horário de atendimento é das **09:00** às **00:00**.',
                })
                .setFooter({
                    text: `${interaction.user.username} | Data: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
                    iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true }),
                });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Fechar Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('📜 Reivindicar Ticket')
                    .setStyle(ButtonStyle.Primary)
            );

            const initialMessage = await ticketChannel.send({
                content: `${userMention} <@&${config.staffRoleId}>`,
                embeds: [embed],
                components: [row],
            });

            await ticketStore.setTicketData(ticketChannel.id, {
                userId: interaction.user.id,
                messageId: initialMessage.id,
                status: 'open',
                ...(translatedRegistrationType && { registrationType: translatedRegistrationType }),
                createdAt: new Date().toISOString(),
                username: username,
                channelId: ticketChannel.id,
            });

            await interaction.reply({
                content: `Seu ticket foi aberto com sucesso em ${ticketChannel}.`,
                flags: 64,
            });

            return ticketChannel;
        } catch (error) {
            console.error('Erro ao criar o ticket:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao criar o seu ticket. Tente novamente mais tarde.',
                flags: 64,
            });
            return null;
        }
    },

    async handleTicketCreation(interaction) {
        if (interaction.isModalSubmit() && interaction.customId === 'register_form') {
            const username = interaction.fields.getTextInputValue('roblox_username');
            const userId = interaction.user.id;
            const registrationType = interactionData.get(userId)?.registrationType;

            const registrationTypeMap = {
                'member': 'Membro <:ClMember:1325077686413955142>',
                'visitor': 'Visitante <:Visitors:1325087745219236002>',
                'partner': 'Parceria <:Partner:1325083016179093614>',
            };

            const translatedRegistrationType = registrationTypeMap[registrationType];

            const guild = interaction.guild;

            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: config.ticketConfig.categoryId,
                    topic: 'Ticket de Registro',
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: config.staffRoleId,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ManageMessages,
                            ],
                        }
                    ]
                });

                const managerRoleMention = `<@&${config.staffRoleId}>`;
                const userMention = `<@${interaction.user.id}>`;

                const embed = new EmbedBuilder()
                    .setColor(0x00AAFF)
                    .setTitle(translatedRegistrationType ? `Ticket de Registro - ${translatedRegistrationType}` : 'Ticket de Registro')
                    .setThumbnail('https://i.ibb.co/89mmXGf/ticket.png')
                    .setDescription(`**Aberto por:** ${userMention}\n**ID:** ${interaction.user.id}\n**Ticket:** ${ticketChannel}`)
                    .addFields({
                        name: 'Seja bem-vindo(a) ao ticket de registro.',
                        value: 'Nossa equipe estará disponível para atendê-lo(a) em breve. O horário de atendimento é das **09:00** às **00:00**.',
                    })
                    .setFooter({
                        text: `${interaction.user.username} | Data: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
                        iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true }),
                    });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Fechar Ticket')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('claim_ticket')
                        .setLabel('📜 Reivindicar Ticket')
                        .setStyle(ButtonStyle.Primary)
                );

                const initialMessage = await ticketChannel.send({
                    content: `${userMention} ${managerRoleMention}`,
                    embeds: [embed],
                    components: [row]
                });

                await ticketStore.setTicketData(ticketChannel.id, {
                    userId: interaction.user.id,
                    messageId: initialMessage.id,
                    status: 'open',
                    ...(translatedRegistrationType && { registrationType: translatedRegistrationType }),
                    createdAt: new Date().toISOString(),
                    username: username,
                    channelId: ticketChannel.id
                });

                await interaction.reply({
                    content: `Seu registro foi criado com sucesso! Acesse o canal ${ticketChannel}.`,
                    flags: 64,
                });

            } catch (error) {
                console.error('Erro ao criar o ticket:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Ocorreu um erro ao criar o seu ticket. Tente novamente mais tarde.',
                        flags: 64,
                    });
                }
            }
        }
    },

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;

        const ticketData = await ticketStore.getTicketData(interaction.channel.id);
        if (!ticketData) {
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: 'Este ticket não está registrado no sistema.',
                    flags: 64,
                });
            }
            return;
        }

        const requiredRoleId = config.staffRoleId;
        const channel = interaction.channel;

        if (interaction.customId === 'close_ticket') {
            if (!interaction.member.roles.cache.has(requiredRoleId) && interaction.user.id !== ticketData.userId) {
                return await interaction.reply({
                    content: `Somente <@&${requiredRoleId}> ou o usuário que abriu o ticket podem fechar este ticket.`,
                    flags: 64,
                });
            }
        
            try {
                await interaction.deferReply();
        
                const registrationType = interactionData.get(ticketData.userId)?.registrationType;
        
                const rolesToAdd = {
                    'member': config.ticketConfig.roles.member,
                    'visitor': config.ticketConfig.roles.visitor,
                    'partner': config.ticketConfig.roles.partner,
                };
        
                const cleanRegistrationType = registrationType?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
                const roleIdToAdd = rolesToAdd[cleanRegistrationType];

                const isStaffClosing = interaction.member.roles.cache.has(requiredRoleId);
        
                if (isStaffClosing && roleIdToAdd) {
                    const member = await interaction.guild.members.fetch(ticketData.userId);
                    if (member) {
                        await member.roles.add(roleIdToAdd);
        
                        const additionalRoleId = config.ticketConfig.additionalRoleId;
                        if (additionalRoleId) {
                            try {
                                const additionalRole = await interaction.guild.roles.fetch(additionalRoleId);
                                if (additionalRole) {
                                    await member.roles.add(additionalRole);
                                }
                            } catch (error) {
                                console.error('Erro ao adicionar o cargo adicional:', error);
                            }
                        }
        
                        const roleToRemoveId = config.ticketConfig.removeRoleId;
                        if (roleToRemoveId) {
                            try {
                                const roleToRemove = await interaction.guild.roles.fetch(roleToRemoveId);
                                if (roleToRemove) {
                                    await member.roles.remove(roleToRemove);
                                }
                            } catch (error) {
                                console.error('Erro ao remover o cargo:', error);
                            }
                        }
                    }
                }

                setTimeout(async () => {
                    await channel.send('🔒 Este ticket será fechado em 10 segundos.');
        
                    const messages = await channel.messages.fetch();
                    let logContent = '';
        
                    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                    sortedMessages.forEach(message => {
                        logContent += `[${moment(message.createdAt).format('DD/MM/YYYY HH:mm:ss')}] (${message.author.username}) ${message.member?.displayName || message.author.username}: ${message.content}\n`;
                    });
        
                    const logFilePath = path.join(__dirname, `${channel.name}.log`);
                    fs.writeFileSync(logFilePath, logContent, 'utf8');
        
                    const logChannel = await interaction.guild.channels.fetch(config.ticketConfig.logTicketChannelId);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(0x00AAFF)
                            .setTitle(`Ticket Registro \`#${channel.name}\``)
                            .setThumbnail('https://i.ibb.co/89mmXGf/ticket.png')
                            .addFields(
                                { name: 'User:', value: `<@${ticketData.userId}>`, inline: true },
                                { name: 'Type:', value: `${ticketData.registrationType || 'N/A'}`, inline: true },
                                {
                                    name: 'Staff:',
                                    value: `Reivindicado por: <@${ticketData.claimedBy || interaction.user.id}>\nFechado por: <@${interaction.user.id}>`,
                                    inline: true
                                },
                                {
                                    name: 'Aberto em:',
                                    value: `<t:${Math.floor(new Date(ticketData.createdAt).getTime() / 1000)}:f>`,
                                    inline: true
                                },
                                {
                                    name: 'Fechado em:',
                                    value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
                                    inline: true
                                }
                            )
                            .setFooter({
                                text: `${interaction.user.username} | Data: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
                                iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true })
                            });
        
                        await logChannel.send({ embeds: [embed] });
                        await logChannel.send({
                            files: [{
                                attachment: logFilePath,
                                name: `${channel.name}.log`
                            }]
                        });
        
                        fs.unlinkSync(logFilePath);
                    }
        
                    setTimeout(async () => {
                        try {
                            await ticketStore.removeTicketData(channel.id);
                            await channel.delete();
                        } catch (error) {
                            console.error('Erro ao deletar o canal:', error);
                        }
                    }, 10000);
                }, 1000);

                await interaction.deleteReply();
        
            } catch (error) {
                console.error('Erro ao fechar ticket:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Ocorreu um erro ao fechar o ticket. Tente novamente.',
                        flags: 64,
                    });
                } else {
                    await interaction.editReply({
                        content: 'Ocorreu um erro ao fechar o ticket. Tente novamente.',
                        flags: 64,
                    });
                }
            }
        }

        if (interaction.customId === 'claim_ticket') {
            if (!interaction.member.roles.cache.has(requiredRoleId)) {
                return await interaction.reply({
                    content: `Somente <@&${requiredRoleId}> podem reivindicar este ticket.`,
                    flags: 64,
                });
            }

            if (ticketData.status === 'claimed') {
                return await interaction.deferUpdate();
            }

            const staffMember = interaction.user;
            const userMention = `<@${ticketData.userId}>`;

            const embed = new EmbedBuilder()
                .setColor(0x00AAFF)
                .setDescription(`**Ticket Reivindicado**\nEste ticket foi reivindicado por **${staffMember}**`)
                .setFooter({
                    text: `${staffMember.tag} | Data: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
                    iconURL: staffMember.displayAvatarURL({ format: 'png', dynamic: true })
                });

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Fechar Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('📜 Reivindicado')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );

            try {
                const messages = await channel.messages.fetch();
                const initialMessage = messages.get(ticketData.messageId);
                if (initialMessage) {
                    await initialMessage.edit({ components: [newRow] });
                }

                await channel.send({
                    content: userMention,
                    embeds: [embed]
                });

                await ticketStore.setTicketData(channel.id, {
                    ...ticketData,
                    status: 'claimed',
                    claimedBy: staffMember.id,
                    claimedAt: new Date().toISOString()
                });

                await interaction.deferUpdate();
            } catch (error) {
                console.error('Erro ao reivindicar ticket:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Ocorreu um erro ao reivindicar o ticket. Tente novamente.',
                        flags: 64,
                    });
                }
            }
        }
    },
};