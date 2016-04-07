var Botkit = require('botkit')
var controller = Botkit.slackbot({
  json_file_store: './db_slackbutton_bot/'
})

var dotenv = require('dotenv')

dotenv.config()

controller.configureSlackApp({
  clientId: process.env.clientId || process.env.CLIENTID,
  clientSecret: process.env.clientSecret || process.env.CLIENTSECRET,
  redirectUri: process.env.redirectUri || process.env.REDIRECTURI || ' http://localhost:7777/oauth',
  scopes: ['users:read', 'bot', 'commands']
})

var _bots = {}
function trackBot (bot) {
  _bots[bot.config.token] = bot
}

controller.setupWebserver(process.env.port || process.env.PORT, function (err, webserver) {
  // set up web endpoints for oauth, receiving webhooks, etc.
  controller
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver, function (err, req, res) {
      console.log('oauth ran')
      console.log(req, res)
      res.redirect('/')
    })
    .createWebhookEndpoints(controller.webserver)
})
controller.on('create_bot', function (bot, config) {
  if (_bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    bot.startRTM(function (err) {
      if (!err) {
        trackBot(bot)
      }

      bot.startPrivateConversation({user: config.createdBy}, function (err, convo) {
        if (err) {
          console.log(err)
        } else {
          convo.say('I am a bot that has just joined your team')
          convo.say('You must now /invite me to a channel so that I can be of use!')
        }
      })
    })
  }
})

// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
  console.log('** The RTM api just connected!')
})

controller.on('rtm_close', function (bot) {
  console.log('** The RTM api just closed')
// you may want to attempt to re-open
})

controller.hears('hello', 'direct_message', function (bot, message) {
  bot.reply(message, 'Hello!')
})

controller.hears('^stop', 'direct_message', function (bot, message) {
  bot.reply(message, 'Goodbye')
  bot.rtm.close()
})

controller.on(['direct_message', 'mention', 'direct_mention'], function (bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  }, function (err) {
    if (err) { console.log(err) }
    bot.reply(message, 'I heard you loud and clear boss.')
  })
})
controller.storage.teams.all(function(err,teams) {

  if (err) {
    throw new Error(err);
  }

  // connect all teams with bots up to slack!
  for (var t  in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM(function(err, bot) {
        if (err) {
          console.log('Error connecting bot to Slack:',err);
        } else {
          trackBot(bot);
        }
      });
    }
  }

});
