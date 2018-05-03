var mongoose = require('mongoose');
var autopopulate = require("mongoose-autopopulate");
// Schema definition
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var SensorSchema = new Schema({
    node_name: {
        type: String,
        required: true,
    },
    hospital_:
    {
        type: Schema.Types.ObjectId,
        ref: 'Hospital'
    },
    floor_:
    {
        type: Schema.Types.ObjectId,
        ref: 'Floor'
    },
    room_:
    {
        type: Schema.Types.ObjectId,
        ref: 'Room'
    },
    bed_:
    {
        type: Schema.Types.ObjectId,
        ref: 'Bed'
    }
});
SensorSchema.plugin(autopopulate);
module.exports = mongoose.model('Sensor', SensorSchema);
