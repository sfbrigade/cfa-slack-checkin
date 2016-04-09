var mongoose = require('mongoose')

var teamsSchema = new mongoose.Schema({
  id: String,
  team_id: String,
  name: String,
  domain: String,
  email_domain: String,
  cfapi_url:String,
  checkin_post_url:String,
  icon: {
    image_34: String,
    image_44: String,
    image_68: String,
    image_88: String,
    image_102: String,
    image_132: String,
    image_original: String
  }
})

module.exports = mongoose.model('Teams', teamsSchema)
