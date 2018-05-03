var Hospital = require("../models/hospital");
var Floor = require("../models/floor");
var Room = require("../models/room");
var Bed = require("../models/bed");
var Patient = require("../models/patient");
var Sensor = require("../models/sensor");

function deleteHospital(_id) {
  console.log(`\nDeleting floors under hospital(id:${_id})`);
  return new Promise((resolve, reject) => {
    return Floor.find({ hospital_: _id })
      .exec()
      .then(floors => {
        if (!floors || floors.length === 0) {
          console.log(`No floor is deleted!\n`);
          return resolve();
        }
        for (let i in floors) {
          const floor = floors[i];
          console.log(`Deleting floor No.${floor.number}(${floor._id})`);
          deleteFloor(_id, floor._id)
            .then(() => {
              floor
                .remove()
                .then(post => {
                  return resolve(post);
                })
                .catch(err => {
                  errTrace(err);
                  return reject(err);
                });
            })
            .catch(err => {
              errTrace(err);
              return reject(err);
            });
        }
      })
      .catch(err => {
        errTrace(err);
        return reject(err);
      });
  });
}
function deleteFloor(hospital_id, floor_id) {
  console.log(`\nDeleting rooms under floor(id:${floor_id})`);
  return new Promise((resolve, reject) => {
    return Room.find({ floor_: floor_id })
      .exec()
      .then(rooms => {
        if (!rooms || rooms.length === 0) {
          console.log(`No room is deleted!\n`);
          return resolve();
        }
        for (let i in rooms) {
          const room = rooms[i];
          console.log(`Deleting room No.${room.number}(${room._id})`);
          deleteRoom(floor_id, room._id)
            .then(() => {
              room
                .remove()
                .then(post => {
                  return resolve(post);
                })
                .catch(err => {
                  errTrace(err);
                  return reject(err);
                });
            })
            .catch(err => {
              errTrace(err);
              return reject(err);
            });
        }
      })
      .catch(err => {
        errTrace(err);
        return reject(err);
      });
  });
}
function deleteRoom(floor_id, room_id) {
  console.log(`\nDeleting beds under room(id:${room_id})`);
  return new Promise((resolve, reject) => {
    return Bed.find({ room_: room_id })
      .exec()
      .then(beds => {
        if (!beds || beds.length === 0) {
          console.log(`No room is deleted!\n`);
          return resolve();
        }
        for (let i in beds) {
          const bed = beds[i];
          console.log(`Deleting bed No.${bed.number}(${bed._id})`);
          deleteBed(bed, room_id, bed._id)
            .then(values => {
              console.log("values\n", values);
              bed
                .remove()
                .then(post => {
                  return resolve(post);
                })
                .catch(err => {
                  errTrace(err);
                  return reject(err);
                });
            })
            .catch(err => {
              errTrace(err);
              return reject(err);
            });
        }
      })
      .catch(err => {
        errTrace(err);
        return reject(err);
      });
  });
}
function deleteBed(bed, room_id, bed_id) {
  const { _sensor_node, _patient } = bed;
  // if sensor is selected
  // update the previous sensor which is occupied by the bed, to null
  let sensorPro = LocateInitFromBed(Sensor, bed_id, _sensor_node);
  let patientPro = LocateInitFromBed(Patient, bed_id, _patient);
  return Promise.all([sensorPro, patientPro])
    .then(values => {
      console.log(`Sensor || Patient check completed!\n`);
      return values;
    })
    .catch(err => {
      console.log(err);
      return err;
    });
}
function errTrace(err) {
  console.log(`Err occured while deleting\n${err}\n`);
  console.trace();
}

// when bed is removed, the location of sensor and patient is initialized to undefined
function LocateInitFromBed(Modal, bed_id, itemId) {
  return new Promise((resolve, reject) => {
    if (!itemId) {
      return resolve("Not set");
    }
    return Modal.findOneAndUpdate(
      { bed_: bed_id },
      {
        bed_: undefined,
        hospital_: undefined,
        floor_: undefined,
        room_: undefined
      }
    )
      .exec()
      .then(post => {
        console.log(`Item: ${itemId} is updated at bed(${bed_id})\n`);
        return resolve(post);
      })
      .catch(err => {
        console.log("Err", err);
        return reject(err);
      });
  });
}
// remove an element from array
function itemRemovedFromAry(Modal, itemCate, itemId, removeFrom) {
  return new Promise((resolve, reject) => {
    if (!removeFrom) {
      console.log(`\nNo upper category\n`);
      return resolve();
    }
    console.log(`\nItem removing..`);
    return Modal.findOneAndUpdate(
      {
        _id: removeFrom
      },
      {
        $pull: {
          [itemCate]: itemId
        }
      }
    )
      .exec(post => {
        console.log(
          `Occupied ${itemCate}(${itemId}) has been removed from upper category(id:${removeFrom})\n`
        );
        resolve(post);
      })
      .catch(err => {
        console.log(
          `Err occured while removing ${itemCate}(${itemId}) from upper category(id:${removeFrom})\n${err}\n`
        );
        reject(err);
      });
  });
}
function itemRemovedFrom(Modal, itemCate, itemId, removeFrom) {
  return new Promise((resolve, reject) => {
    if (!removeFrom) {
      console.log(`\nNo upper category\n`);
      return resolve();
    }
    console.log(`\nItem removing..`);
    return Modal.findOneAndUpdate(
      {
        _id: removeFrom
      },
      {
        [itemCate]: undefined
      }
    )
      .exec(post => {
        console.log(
          `Occupied ${itemCate}(${itemId}) has been removed from upper category(id:${removeFrom})\n`
        );
        resolve(post);
      })
      .catch(err => {
        console.log(
          `Err occured while removing ${itemCate}(${itemId}) from upper category(id:${removeFrom})\n${err}\n`
        );
        reject(err);
      });
  });
}

module.exports = {
  deleteHospital,
  deleteFloor,
  deleteRoom,
  deleteBed,
  itemRemovedFrom,
  itemRemovedFromAry,
  LocateInitFromBed
};
