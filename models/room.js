var mongoose = require('mongoose');
var autopopulate = require("mongoose-autopopulate");

mongoose.Promise = global.Promise;

// Schema definition
var Schema = mongoose.Schema;

var RoomSchema = new Schema({
    number: Number,
    room_class: String,
    _bed_list: 
    [
        {
            type: Schema.Types.ObjectId,
            ref: 'Bed'/* ,
            autopopulate: true */
        }
    ],
    floor_:
    {
        type: Schema.Types.ObjectId,
        ref: 'Floor'
    },
    imgSrc: String,
    imgDeleteHash: String
});
RoomSchema.plugin(autopopulate);
module.exports = mongoose.model('Room', RoomSchema);
