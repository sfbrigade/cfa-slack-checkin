var mongoose = require('mongoose')

var usersSchema = new mongoose.Schema({
  id: String,
  user_id: String,
  team_id: String,
  name: String,
  deleted: Boolean,
  status: String,
  color: String,
  real_name: String,
  tz: String,
  tz_label: String,
  tz_offset: Number,
  profile: {
    first_name: String,
    last_name: String,
    avatar_hash: String,
    image_24: String,
    image_32: String,
    image_48: String,
    image_72: String,
    image_192: String,
    image_512: String,
    image_1024: String,
    image_original: String,
    title: String,
    phone: String,
    skype: String,
    real_name: String,
    real_name_normalized: String,
  email: String },
  is_admin: Boolean,
  is_owner: Boolean,
  is_primary_owner: Boolean,
  is_restricted: Boolean,
  is_ultra_restricted: Boolean,
  is_bot: Boolean
})

module.exports = mongoose.model('Users', usersSchema)
