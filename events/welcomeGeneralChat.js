const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const ROLE_ID = config.welcomeGeneralChatConfig.roleId;
const WELCOME_CHANNEL_ID = config.welcomeGeneralChatConfig.welcomeChannelId;

const THUMBNAIL_URL = "https://i.ibb.co/DgDgxrT/guy-crimson-that-day-i-got-reincarnated-as-a-slime.gif";

client.on('guildMemberUpdate', (oldMember, newMember) => {

  if (!oldMember.roles.cache.has(ROLE_ID) && newMember.roles.cache.has(ROLE_ID)) {

    const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {

      channel.send(`<@${newMember.user.id}> Seja bem-vindo(a) ao clã! 🤍💛🖤✨`);

      const welcomeEmbed = new EmbedBuilder()
        .setColor('#DC143C')
        .setDescription(`
          Antes de começar a explorar, recomendamos que você:
          \n**●** Leia as regras em <#${config.welcomeGeneralChatConfig.rulesChannelId}>
          **●** Personalize seu perfil em <#${config.welcomeGeneralChatConfig.registerChannelId}> e <#${config.welcomeGeneralChatConfig.colorsChannelId}>
          **●** Junte-se ao nosso grupo em <#${config.welcomeGeneralChatConfig.groupChannelId}>
          **●** Veja nossas roupas em <#${config.welcomeGeneralChatConfig.clothesChannelId}> e <#${config.welcomeGeneralChatConfig.skinReferencesChannelId}>
          \n**Agradecemos por fazer parte do nosso clã!** 🙏
          Lembre-se, nossa comunidade valoriza **respeito e boa conduta** em todos os momentos. Seja gentil e aproveite a experiência ao máximo! ✨
        `)
        .setThumbnail(THUMBNAIL_URL)
        .setFooter({
          text: 'Rouge',
          iconURL: client.user.displayAvatarURL()
        });

      channel.send({ embeds: [welcomeEmbed] });
    }
  }
});

client.login(process.env.TOKEN);