var mongoose = require('mongoose')

var logsSchema = new mongoose.Schema({
  unixTimestamp: Number,
  userId: String,
  teamId: String,
  channel: String,
  newsletter: String
})

module.exports = mongoose.model('Logs', logsSchema)
