const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const config = require('../config.json');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const dataFolderPath = path.join(__dirname, '..', 'data');
const verifiedUsersPath = path.join(dataFolderPath, 'verifiedUsers.json');

function loadVerifiedUsers() {
    if (!fs.existsSync(dataFolderPath)) {
        fs.mkdirSync(dataFolderPath);
    }

    if (!fs.existsSync(verifiedUsersPath)) {
        fs.writeFileSync(verifiedUsersPath, JSON.stringify({}));
    }

    const data = fs.readFileSync(verifiedUsersPath, 'utf-8');
    return JSON.parse(data);
}

function saveVerifiedUsers(users) {
    fs.writeFileSync(verifiedUsersPath, JSON.stringify(users, null, 2));
}

module.exports = {
    name: 'verify',

    activeSessions: new Set(),

    async handleButtonInteraction(interaction) {
        if (interaction.customId === 'verify_button') {
            if (interaction.replied || interaction.deferred) return;

            const originalMessage = await interaction.channel.messages.fetch(config.verifyConfig.preserveMessageId);
            const disabledButton = new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Iniciar')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(disabledButton);
            await originalMessage.edit({ components: [row] });

            const timeoutTimestamp = Math.floor(Date.now() / 1000) + 120;

            const verificationStartedEmbed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setDescription(`${interaction.user} iniciou a verificação da TAG.\nA verificação será reiniciada <t:${timeoutTimestamp}:R>.`);

            await interaction.channel.send({ embeds: [verificationStartedEmbed] });

            const sessionId = uuidv4();
            this.activeSessions.add(sessionId);

            const channel = interaction.channel;
            const preserveMessageId = config.verifyConfig.preserveMessageId;

            setTimeout(async () => {
                this.activeSessions.delete(sessionId);

                const messages = await channel.messages.fetch({ limit: 100 });
                const messagesToDelete = messages.filter(msg => msg.id !== preserveMessageId);

                await channel.bulkDelete(messagesToDelete, true).catch(err => {
                    console.error('Erro ao excluir mensagens:', err);
                });

                const enabledButton = new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Iniciar')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(false);

                const newRow = new ActionRowBuilder().addComponents(enabledButton);
                await originalMessage.edit({ components: [newRow] });

            }, 120000);

            const modal = new ModalBuilder()
                .setCustomId(`roblox_username_modal_${sessionId}`)
                .setTitle('Verificação de TAG do Roblox');

            const usernameInput = new TextInputBuilder()
                .setCustomId('roblox_username')
                .setLabel('Digite seu nome de usuário do Roblox:')
                .setPlaceholder('Digite o seu username do Roblox sem o @')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(usernameInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith('confirm_verification_')) {
            if (interaction.replied || interaction.deferred) return;

            const userId = interaction.customId.split('_')[2];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: 'Somente o usuário que está fazendo a verificação pode confirmar.', flags: 64 });
            }

            const member = interaction.member;
            const channel = interaction.channel;
            const rolesToAdd = config.verifyConfig.rolesToAdd;
            const rolesToRemove = config.verifyConfig.rolesToRemove;
            const preserveMessageId = config.verifyConfig.preserveMessageId;

            try {
                const verifiedUsers = loadVerifiedUsers();

                const displayName = interaction.message.embeds[0]?.fields.find(field => field.name === 'Display Name')?.value;

                for (const roleId of rolesToAdd) {
                    await member.roles.add(roleId);
                }

                for (const roleId of rolesToRemove) {
                    await member.roles.remove(roleId);
                }

                if (displayName) {
                    await member.setNickname(displayName).catch(err => {
                        console.error('Erro ao alterar o nickname do usuário:', err);
                    });
                }

                const robloxId = interaction.message.embeds[0]?.fields.find(field => field.name === 'ID')?.value;
                const verifiedAt = new Date().toISOString();

                verifiedUsers[displayName] = {
                    robloxId: parseInt(robloxId, 10),
                    discordId: interaction.user.id,
                    verifiedAt: verifiedAt,
                };

                saveVerifiedUsers(verifiedUsers);

                const completeEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Verificação Completa!')
                    .setDescription('Você foi verificado e os novos cargos foram adicionados.')
                    .setFooter({ text: 'Obrigado por verificar sua TAG!' });

                await interaction.reply({ embeds: [completeEmbed] });

                const disabledButton = new ButtonBuilder()
                    .setCustomId(`confirm_verification_${userId}`)
                    .setLabel('Confirmar Verificação')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                const row = new ActionRowBuilder().addComponents(disabledButton);

                await interaction.message.edit({ components: [row] });

                const logChannel = interaction.guild.channels.cache.get(config.verifyConfig.logVerifyChannelId);
                if (!logChannel) {
                    console.error('Canal de log não encontrado!');
                    return;
                }

                const rolesAddedMention = rolesToAdd.map(roleId => `<@&${roleId}>`).join(', ');
                const rolesRemovedMention = rolesToRemove.map(roleId => `<@&${roleId}>`).join(', ');

                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`${member.displayName} verificou a TAG`)
                    .setThumbnail(interaction.message.embeds[0]?.thumbnail?.url) // Usa a thumbnail do embed anterior
                    .addFields(
                        { name: 'Discord', value: `<@${interaction.user.id}>\nID:\n${interaction.user.id}`, inline: true },
                        { name: 'Roblox Display Name', value: displayName, inline: true },
                        { name: 'Roblox Username', value: `${interaction.message.embeds[0]?.fields.find(field => field.name === 'Nome de Usuário')?.value}\nID:\n${robloxId}`, inline: true },
                        { name: 'Data de Criação da Conta', value: new Date(interaction.message.embeds[0]?.fields.find(field => field.name === 'Criado em')?.value).toLocaleDateString(), inline: true },
                        { name: 'Cargos Adicionados', value: rolesAddedMention || 'Nenhum', inline: true },
                        { name: 'Cargos Removidos', value: rolesRemovedMention || 'Nenhum', inline: true },
                        { name: 'Data e Hora da Verificação', value: new Date().toLocaleString(), inline: true }
                    )
                    .setFooter({
                        text: `${interaction.user.username} | Data: ${new Date().toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                        })}`,
                        iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true })
                    });

                await logChannel.send({ embeds: [logEmbed] });

                setTimeout(async () => {
                    const messages = await channel.messages.fetch({ limit: 100 });
                    const messagesToDelete = messages.filter(msg => msg.id !== preserveMessageId);

                    await channel.bulkDelete(messagesToDelete, true).catch(err => {
                        console.error('Erro ao excluir mensagens:', err);
                    });

                    const originalMessage = await interaction.channel.messages.fetch(preserveMessageId);
                    const enabledButton = new ButtonBuilder()
                        .setCustomId('verify_button')
                        .setLabel('Iniciar')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(false);

                    const newRow = new ActionRowBuilder().addComponents(enabledButton);
                    await originalMessage.edit({ components: [newRow] });

                }, 15000);

            } catch (error) {
                console.error('Erro ao gerenciar cargos ou alterar nickname:', error);
                await interaction.reply({ content: 'Ocorreu um erro ao gerenciar os cargos ou alterar o nickname. Tente novamente mais tarde.', flags: 64 });
            }
        }
    },

    async handleModalSubmit(interaction) {
        if (interaction.customId.startsWith('roblox_username_modal_')) {
            if (interaction.replied || interaction.deferred) return;

            const sessionId = interaction.customId.split('_')[3];

            if (!this.activeSessions.has(sessionId)) {
                return interaction.reply({ content: 'Este formulário expirou. Por favor, clique em "Iniciar" novamente.', flags: 64 });
            }

            const robloxUsername = interaction.fields.getTextInputValue('roblox_username');

            try {
                const verifiedUsers = loadVerifiedUsers();

                const userInfoResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
                    usernames: [robloxUsername],
                });

                if (userInfoResponse.data.data.length === 0) {
                    return interaction.reply({ content: 'Usuário não encontrado!', flags: 64 });
                }

                const userId = userInfoResponse.data.data[0].id;

                const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
                const userData = response.data;

                const avatarResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
                let avatarUrl = avatarResponse.data.data[0]?.imageUrl;

                if (!avatarUrl) {
                    avatarUrl = 'https://i.ibb.co/zVwhWXk/content-deleted.png';
                }

                const displayName = userData.displayName;
                const isValidTag = displayName.startsWith('01') && displayName.endsWith('_z');

                if (verifiedUsers[displayName]) {
                    const alreadyVerifiedEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle(`A TAG ${displayName} já foi verificada!`)
                        .setDescription(`O usuário ${displayName} já tem sua tag verificada no sistema.\n\nSe isso for um erro, entre em contato com o suporte em <#${config.verifyConfig.ticketChannelId}>.`)
                        .setFooter({ text: 'Usuário já verificado' });

                    await interaction.reply({ embeds: [alreadyVerifiedEmbed] });

                    const channel = interaction.channel;
                    const preserveMessageId = config.verifyConfig.preserveMessageId;

                    setTimeout(async () => {
                        const messages = await channel.messages.fetch({ limit: 100 });
                        const messagesToDelete = messages.filter(msg => msg.id !== preserveMessageId);

                        await channel.bulkDelete(messagesToDelete, true).catch(err => {
                            console.error('Erro ao excluir mensagens:', err);
                        });

                        const originalMessage = await interaction.channel.messages.fetch(preserveMessageId);
                        const enabledButton = new ButtonBuilder()
                            .setCustomId('verify_button')
                            .setLabel('Iniciar')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(false);

                        const newRow = new ActionRowBuilder().addComponents(enabledButton);
                        await originalMessage.edit({ components: [newRow] });

                    }, 15000);

                    return;
                }

                const userEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Informações do Usuário: ${userData.name}`)
                    .setThumbnail(avatarUrl)
                    .addFields(
                        { name: 'Nome de Usuário', value: userData.name || 'Não disponível', inline: true },
                        { name: 'Display Name', value: userData.displayName || 'Não definido', inline: true },
                        { name: 'Criado em', value: new Date(userData.created).toLocaleDateString(), inline: true },
                        { name: 'ID', value: userData.id.toString(), inline: true }
                    )
                    .setFooter({ text: 'Informações extraídas de Roblox API' });

                if (isValidTag) {
                    const validTagEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle(`${displayName} (${userData.name}) tem a TAG do clã!`)
                        .setDescription('Clique abaixo para finalizar a verificação.')
                        .setFooter({ text: 'Clique para confirmar!' });

                    const button = new ButtonBuilder()
                        .setCustomId(`confirm_verification_${interaction.user.id}`)
                        .setLabel('Confirmar Verificação')
                        .setStyle(ButtonStyle.Success);

                    const row = new ActionRowBuilder().addComponents(button);

                    await interaction.reply({
                        embeds: [userEmbed, validTagEmbed],
                        components: [row]
                    });
                } else {
                    const invalidTagEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle(`${displayName} (${userData.name}) NÃO tem a TAG do clã!`)
                        .setDescription('Este usuário não tem a TAG válida do clã.\n\nAltere seu display name para o formato `01<Name>_z` e tente verificar novamente.')
                        .setFooter({ text: 'Verifique novamente!' });

                    await interaction.reply({
                        embeds: [userEmbed, invalidTagEmbed]
                    });

                    const channel = interaction.channel;
                    const preserveMessageId = config.verifyConfig.preserveMessageId;

                    setTimeout(async () => {
                        const messages = await channel.messages.fetch({ limit: 100 });
                        const messagesToDelete = messages.filter(msg => msg.id !== preserveMessageId);

                        await channel.bulkDelete(messagesToDelete, true).catch(err => {
                            console.error('Erro ao excluir mensagens:', err);
                        });

                        const originalMessage = await interaction.channel.messages.fetch(preserveMessageId);
                        const enabledButton = new ButtonBuilder()
                            .setCustomId('verify_button')
                            .setLabel('Iniciar')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(false);

                        const row = new ActionRowBuilder().addComponents(enabledButton);
                        await originalMessage.edit({ components: [row] });

                    }, 15000);
                }

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Ocorreu um erro ao buscar as informações do usuário. Tente novamente mais tarde.', flags: 64 });
            }
        }
    }
};