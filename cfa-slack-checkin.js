// mongoose
// request
// csv builder
var _ = require('lodash')

var dotenv = require('dotenv')

dotenv.config()

// bootstrap database
require('./helpers/db')()

// retrieve models
var Log = require('./models/Logs')
var Team = require('./models/Teams')
var User = require('./models/Users')

// Set up slack bot
var Botkit = require('botkit')
var controller = Botkit.slackbot()

controller.configureSlackApp({
  clientId: process.env.clientId || process.env.CLIENTID,
  clientSecret: process.env.clientSecret || process.env.CLIENTSECRET,
  redirectUri: process.env.redirectUri || process.env.REDIRECTURI || ' http://localhost:7777/oauth',
  scopes: ['users:read', 'team:read', 'bot', 'commands']
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
  console.log(config)
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
          convo.say('Thank you for adding CfA Brigade Check in bot!\n'
            + 'To print out usage options, type `help`\n'
            + 'To configure this bot, type `configure`\n'
            + 'To prepare a CSV of checkin statistics, type `prepare report`\n'
            + "(don't worry, these are only available to team admins)\n"
            + 'Am I misbehaving? Reach out to my developer, @therebelrobot (trentoswald@therebelrobot.com)\n'
            + 'or open a github issue at https://github.com/sfbrigade/cfa-slack-checkin/issues/new')
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
controller.on('slash_command', function (bot, message) {
  console.log('slash command', message)
  bot.api.users.list({}, function (err, results) {
    console.log(results.members, arguments)
    var thisUser = _.filter(results.members, {id: message.user})[0]
    var name = thisUser.real_name || thisUser.name
    var email = thisUser.profile.email
    var mailingList = (message.text === 'newsletter')
    var newsletterComment = mailingList ? ' and signed up for the CfA newsletter' : ''
    // call mongoose for postURL, cfapi_url and event
    // refer https://www.codeforamerica.org/brigade/Code-for-San-Francisco/checkin/?event=Hack+Night&question=Is+this+your+first+Hack+Night%3F
    // send POST request to process.env.checkinUrl
    // with name, email, mailinglist,
    // cfapi_url (https://www.codeforamerica.org/api/organizations/Code-for-San-Francisco),
    // event, question, answer

    bot.replyPrivate(message, 'Thanks, ' + name + ', you have checked in' + newsletterComment + '! Thanks for supporting your brigade!')
  })
})
controller.hears('configure', 'direct_message', function (bot, message) {
  console.log(bot, message)
  // check message.user for if admin
  // if not admin, respond sorry
  // if admin, request post url
  bot.api.users.list({}, function (err, results) {
    console.log(results.members)
    var thisUser = _.filter(results.members, {id: message.user})[0]
    var name = thisUser.real_name || thisUser.name
    if (!thisUser.is_admin) {
      return bot.reply(message, "I'm sorry " + name + ', bot `configure` options are only available to team admins. Happy hacking!')
    }
    bot.startPrivateConversation({user: message.user}, function (err, convo) {
      convo.say('Hi ' + name + ", let's get your checkin settings configured.")
      bot.api.team.info({}, function (err, apiResults) {
        console.log(apiResults)
        Team.find({team_id: apiResults.team.id}, function (err, mongoResults) {
          if (err) throw err
          var thisTeam
          if (mongoResults.length) {
            thisTeam = mongoResults[0]
          } else {
            thisTeam = new Team(apiResults)
          }
          convo.ask('What is the POST url for your CfA Check in form?', function (response, convo) {
            console.log(response)
            convo.say('saving checkinUrl: ' + response.text)
            convo.next()
          })
          convo.ask("What is your brigade's cfapi url?", function (response, convo) {
            console.log(response)
            convo.say('saving cfapi_url: ' + response.text)
            convo.next()
          })
        })
      })
    })
  })
})
controller.hears('prepare report', 'direct_message', function (bot, message) {
  console.log(message)
  // check message.user for if admin
  // if not admin, respond sorry
  // if admin, check type of report and prepare csv for download

  bot.api.users.list({}, function (err, results) {
    console.log(results.members, arguments)
    var thisUser = _.filter(results.members, {id: message.user})[0]
    var name = thisUser.real_name || thisUser.name
    if (!thisUser.is_admin) {
      return bot.reply(message, "I'm sorry " + name + ', but checkin reports are only available to team admins. Happy hacking!')
    }
    bot.reply(message, 'preparing report for ' + message.text)
  })
})

controller.on(['direct_message', 'mention'], function (bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  }, function (err) {
    if (err) { console.log(err) }
    bot.reply(message, 'I heard you loud and clear boss.')
  })
})
controller.storage.teams.all(function (err, teams) {
  if (err) {
    throw new Error(err)
  }

  // connect all teams with bots up to slack!
  for (var t in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM(function (err, bot) {
        if (err) {
          console.log('Error connecting bot to Slack:', err)
        } else {
          trackBot(bot)
        }
      })
    }
  }
})
