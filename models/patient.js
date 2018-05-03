var mongoose = require("mongoose");
var DateOnly = require("mongoose-dateonly")(mongoose);
var autopopulate = require("mongoose-autopopulate");
// Schema definition
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var PatientSchema = new Schema({
  first_name: String,
  last_name: String,
  birth: Date,
  enter_date: Date,
  leave_date: Date,
  phone_number: String,
  address: String,
  hospital_: {
    type: Schema.Types.ObjectId,
    ref: "Hospital"
  },
  floor_: {
    type: Schema.Types.ObjectId,
    ref: "Floor"
  },
  room_: {
    type: Schema.Types.ObjectId,
    ref: "Room"
  },
  bed_: {
    type: Schema.Types.ObjectId,
    ref: "Bed"
  },
  imgSrc: String,
  imgDeleteHash: String
});
PatientSchema.plugin(autopopulate);

module.exports = mongoose.model("Patient", PatientSchema);
