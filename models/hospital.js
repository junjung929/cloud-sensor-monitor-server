var mongoose = require("mongoose");
var autopopulate = require("mongoose-autopopulate");

mongoose.Promise = global.Promise;
// Schema definition
var Schema = mongoose.Schema;

var HospitalSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  imgSrc: String,
  imgDeleteHash: String,
  address: String,
  phone_number: String,
  _floor_list: [
    {
      type: Schema.Types.ObjectId,
      ref: "Floor" /* ,
            autopopulate: true */
    }
  ]
});
HospitalSchema.plugin(autopopulate);

module.exports = mongoose.model("Hospital", HospitalSchema);
