var mongoose = require("mongoose");
var autopopulate = require("mongoose-autopopulate");

// Schema definition
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var FloorSchema = new Schema({
  number: Number,
  _room_list: [
    {
      type: Schema.Types.ObjectId,
      ref: "Room" /* ,
            autopopulate: true */
    }
  ],
  hospital_: {
    type: Schema.Types.ObjectId,
    ref: "Hospital"
  },
  imgSrc: String,
  imgDeleteHash: String
});
FloorSchema.plugin(autopopulate);
module.exports = mongoose.model("Floor", FloorSchema);
