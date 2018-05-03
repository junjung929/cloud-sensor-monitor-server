var mongoose = require('mongoose');
var autopopulate = require("mongoose-autopopulate");
// Schema definition
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var BedSchema = new Schema({
    number: Number,
    _patient:
    {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
    },
    room_:
    {
        type: Schema.Types.ObjectId,
        ref: 'Room'
    },
    _sensor_node:
    {
        type: Schema.Types.ObjectId,
        ref: `Sensor`
    },
    imgSrc: String,
    imgDeleteHash: String
});
BedSchema.plugin(autopopulate);
module.exports = mongoose.model('Bed', BedSchema);
