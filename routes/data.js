var _ = require("lodash");
var express = require("express");
var router = express.Router();
var { parseString } = require("xml2js");

let sensors = [];
let clearCnt = 0;

router.get("/", function(req, res, next) {
  res.send(sensors);
});
router.get("/sensor=:node", function(req, res, next) {
  let { node } = req.params;
  console.log(node);

  const sensor = sensors.filter(sensor => sensor.sensor_name == node)
  res.send(sensor);
});
router.get("/update/sensor=:node", function(req, res, next) {
  let { node } = req.params;
  console.log(node);

  const sensor = sensors.filter(sensor => sensor.sensor_name == node)
  const lastValue = _.findLast(sensor)
  res.send(lastValue);
});


router.post("/push", function(req, res) {
  let body = "";

  console.log(clearCnt);
  clearCnt++;
  if (clearCnt > 300) {
    clearCnt = 0;
  }
  console.log(req.connection.remoteAddress);
  req.on("data", function(data) {
    body += data;
  });
  req.on("end", function() {
    parseString(body, function(err, result) {
      if (!result) {
        console.log("no result");
        return res.status(500);
      }
      let sensor = [],
        HR = [],
        RR = [],
        SV = [],
        HRV = [],
        signalStrength = [],
        B2B = [],
        B2B1 = [],
        B2B2 = [];
      let timeTemp = new Date().getTime();

      let sensorNode = result.Data.Network[0].Node[0];
      let nodeId = sensorNode.$.id;
      let { Measurement } = sensorNode.Sensor[0];
      let { Component } = Measurement[0];
      let values = Measurement[0].Values[0]._;
      let sensorValues = values.split(",");
      let valueLen = sensorValues.length;
      let i = 0;
      let timediffer = 0;
      for (let j = 0; j < sensorValues.length / 9 - 1; j++) {
        const finnishTimeZone = 7200000;
        timediffer += 10 * 100;
        let date = timeTemp + finnishTimeZone + timediffer;

        sensorValues[i++];

        HR.push([date, parseInt(sensorValues[i++])]); //heart rate
        RR.push([date, parseInt(sensorValues[i++])]); //respiration rate
        SV.push([date, parseInt(sensorValues[i++])]); //relativeStrokeVolume
        HRV.push([date, parseInt(sensorValues[i++])]); //heartRateVariability
        signalStrength.push([date, parseInt(sensorValues[i++])]); //measured signal strength indication
        B2B.push([date, parseInt(sensorValues[i++])]); //beat2beat time
        B2B1.push([date, parseInt(sensorValues[i++])]);
        B2B2.push([date, parseInt(sensorValues[i++])]);
      }
     
      sensors.push({ time: timeTemp, sensor_name: nodeId, data: { HR, RR, SV, HRV, signalStrength, B2B, B2B1, B2B2 } });
    });
  });
});
module.exports = router;
