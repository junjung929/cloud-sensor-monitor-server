var Hospital = require("../models/hospital");
var Floor = require("../models/floor");
var Room = require("../models/room");
var Bed = require("../models/bed");
var Patient = require("../models/patient");
var Sensor = require("../models/sensor");

function addFloorAt(id, hospital_) {
  return new Promise((resolve, reject) => {
    return addListItem(Hospital, "_floor_list", id, hospital_)
      .then(post => {
        return resolve(post);
      })
      .catch(err => {
        return reject(err);
      });
  });
}
function addRoomAt(id, floor_) {
  return new Promise((resolve, reject) => {
    return addListItem(Floor, "_room_list", id, floor_)
      .then(post => {
        return resolve(post);
      })
      .catch(err => {
        return reject(err);
      });
  });
}
function addBedAt(
  bed_id,
  room_,
  res,
  _sensor_node,
  _patient,
  hospital_,
  floor_
) {
  return new Promise((resolve, reject) => {
    return addListItem(Room, "_bed_list", bed_id, room_)
      .then(post => {
        bedSave(bed_id, _sensor_node, _patient, hospital_, floor_, room_);
        return resolve(post);
      })
      .catch(err => {
        return reject(err);
      });
  });
}
function addListItem(Modal, list, listItem, addAt) {
  console.log(
    `\nAdding item(${listItem}) into ${list} at upper category(id:${addAt}`
  );
  return new Promise(function(resolve, reject) {
    Modal.findOneAndUpdate(
      { _id: addAt },
      {
        $push: {
          [list]: listItem
        }
      }
    ).exec(function(err, post) {
      if (err) {
        console.log(`Failed adding item\n${err}\n`);
        return reject(err);
      }
      console.log(`Added item(${post._id}) into ${list}!\n`);
      return resolve(post);
    });
  });
}
function bedSave(bed_id, _sensor_node, _patient, hospital_, floor_, room_) {
  if (_patient !== undefined && _patient !== "") {
    Patient.findOneAndUpdate(
      { bed_: bed_id },
      {
        bed_: undefined,
        hospital_: undefined,
        floor_: undefined,
        room_: undefined
      }
    )
      .exec(function(err, patient) {
        if (patient) {
          console.log(
            `\nPrevious Patient: ${patient.first_name} ${
              patient.last_name
            }(${_patient}) is removed from bed(${bed_id})`
          );
        } else {
          console.log(`\nThere was no patient on the bed(${bed_id}`);
        }
      })
      .catch(err => {
        console.log(
          `\nWhile updating patient(${_patient}) on the bed(${bed_id}),\n${err}`
        );
      })
      .then(() => {
        Patient.findOneAndUpdate(
          { _id: _patient },
          {
            bed_: bed_id,
            hospital_,
            floor_,
            room_
          }
        )
          .exec(function(err) {
            console.log(
              `\nCurrent Patient: ${_patient} is updated at bed(${bed_id})`
            );
          })
          .catch(err => {
            console.log(
              `\nWhile updating patient(${_patient}) on the bed(${bed_id}),\n${err}`
            );
          });
      });
  }
  // if sensor is selected
  if (_sensor_node !== undefined && _sensor_node !== "") {
    // update the previous sensor which is occupied by the bed, to null
    Sensor.findOneAndUpdate(
      { bed_: bed_id },
      {
        bed_: undefined,
        hospital_: undefined,
        floor_: undefined,
        room_: undefined
      }
    )
      .exec(function(err, sensor) {
        if (sensor) {
          console.log(
            `\nPrevious Sensor Node: ${
              sensor.node_name
            }(${_sensor_node}) is removed from bed(${bed_id})`
          );
        } else {
          console.log(`\nThere was no sensor on the bed(${bed_id}`);
        }
      })
      .catch(err => {
        console.log(
          `\nWhile updating sensor(${_sensor_node}) on the bed(${bed_id}),\n${err}`
        );
      })
      .then(() => {
        // update the new sensor
        Sensor.findOneAndUpdate(
          { _id: _sensor_node },
          {
            bed_: bed_id,
            hospital_,
            floor_,
            room_
          }
        )
          .exec(function(err) {
            console.log(
              `\nCurrent Sensor: ${_sensor_node} is updated at bed(${bed_id})`
            );
          })
          .catch(err => {
            console.log(
              `\nWhile updating sensor(${_sensor_node}) on the bed(${bed_id}),\n${err}`
            );
          });
      });
  }
}
// when patient or sensor is added or updated, add the id into the bed where the item is deployed
function itemDeployedAt(Modal, itemCate, itemId, deployAt) {
  return new Promise((resolve, reject) => {
    if (!deployAt) {
      return resolve();
    }
    console.log(`\nDeploying...`);
    return Modal.findOneAndUpdate(
      { _id: deployAt },
      {
        [itemCate]: itemId
      }
    )
      .exec(post => {
        console.log(
          `Deployed item(${itemId}) into ${itemCate} at (${deployAt})`
        );
        return resolve(post);
      })
      .catch(err => {
        console.log(`\nWhile deploying, ${err}`);
        return reject(err);
      });
  });
}
// check the bed is currently empty or not
function isBedEmpty(bed_id, cate) {
  return new Promise((resolve, reject) => {
    if (!bed_id) {
      return resolve(true);
    }
    return Bed.findOne({ _id: bed_id })
      .where({ [cate]: { $ne: null } })
      .exec(function(err, bed) {
        if (err) {
          console.log(`\nWhile checking bed is empty, ${err}`);
          return reject(err);
        }
        if (!bed) {
          console.log(`\nBed(${bed_id}) is empty`);
          return resolve(true);
        } else {
          console.log(`\nNo.${bed.number} Bed(${bed_id}) is occupied`);
          return resolve(false);
        }
        //if it's empty, it returns null
      });
  });
}

module.exports = {
  isBedEmpty,
  addBedAt,
  addFloorAt,
  addListItem,
  addRoomAt,
  bedSave,
  itemDeployedAt
};
