const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const moment = require('moment');

module.exports = {
    name: 'registerForm',
    description: 'Processa a submissão de formulários de registro.',

    async handleInteraction(interaction) {
        if (!interaction.isModalSubmit() || interaction.customId !== 'register_form') return;

        try {
            const username = interaction.fields.getTextInputValue('roblox_username');
            const age = parseInt(interaction.fields.getTextInputValue('age')); // Converte a idade para um número
            const gender = interaction.fields.getTextInputValue('gender');
            const invitedBy = interaction.fields.getTextInputValue('invited_by') || 'Não informado';
            const reason = interaction.fields.getTextInputValue('reason');

            const guild = interaction.guild;

            // Embed do registro normal
            const embed = new EmbedBuilder()
                .setColor(0x00AAFF)
                .setTitle('\u{1F4C4} Registro Recebido')
                .addFields(
                    { name: 'User:', value: `<@${interaction.user.id}>`, inline: true }, // Nome de usuário do Discord em menção
                    { name: 'Roblox:', value: username, inline: true }, // Roblox Username com ":" na frente
                    { name: 'Idade:', value: `**${age}**`, inline: true }, // Idade em negrito
                    { name: 'Gênero:', value: gender, inline: true },
                    { name: 'Convidado por:', value: invitedBy, inline: true },
                    { name: 'Razão para entrar:', value: reason }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ format: 'png', dynamic: true })) // Adiciona a foto do usuário como thumbnail
                .setFooter({
                    text: `${interaction.user.username} | Data: ${new Date().toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                        hour12: false
                    })}`,
                    iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true })
                });

            // Verificação de idade
            const logChannel = interaction.guild.channels.cache.get(config.ticketConfig.logFormChannelId);

            if (age < 17) {
                // Cria uma embed de aviso de idade
                const warningEmbed = new EmbedBuilder()
                    .setColor(0xFF0000) // Cor vermelha
                    .setTitle('⚠️ Aviso de Idade! ⚠️')
                    .setDescription(`O usuário <@${interaction.user.id}> não tem a idade mínima de 17 anos.`);

                // Envia a embed de registro primeiro no canal de logs
                if (logChannel) {
                    const logMessage = await logChannel.send({ embeds: [embed] });

                    // Envia a embed de aviso como reply na mensagem de log
                    await logMessage.reply({ embeds: [warningEmbed] });
                }

            } else {
                // Se a idade for 17 ou mais, apenas envia o registro
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                }

            }

        } catch (error) {
            console.error('Erro ao processar submissão do formulário:', error);
            // Removido o bloco que responde com mensagem de erro.
        }
    }
};