/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const miflora = require('./miflora.js');

/**
 * Save data to data store
 */
async function saveDeviceData(DataValues) {
  const SQL = 'INSERT INTO garden_sensor("time", sender, address, identifier, battery, sunlight, moisture, fertiliser) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
  const SQLValues = [
    new Date(),
    process.env.Environment,
    DataValues.address,
    DataValues.type,
    DataValues.battery,
    DataValues.lux,
    DataValues.moisture,
    DataValues.fertility,
  ];

  try {
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', `Save sensor values for device: ${SQLValues[2]}`);
    const results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount !== 1) {
      serviceHelper.log('error', `Failed to insert data for device: ${SQLValues[2]}`);
    } else {
      serviceHelper.log('info', `Saved data for device: ${SQLValues[2]}`);
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
}

async function getFlowerCareData(device) {
  try {
    const deviceData = {};
    serviceHelper.log('trace', `Getting sensor data for device: ${device.address}`);
    try {
      serviceHelper.log('trace', `Connect to device: ${device.address}`);
      const connected = await device.connect();
      if (connected instanceof Error) {
        serviceHelper.log('error', `Not able to connect to device: ${device.address}`);
        return;
      }
      serviceHelper.log('trace', `Get sensor data from: ${device.address}`);
      const baseData = await device.query();
      if (baseData instanceof Error) {
        serviceHelper.log('error', `Not able to query device: ${device.address}`);
        return;
      }

      deviceData.address = baseData.address;
      deviceData.type = baseData.type;
      deviceData.battery = baseData.firmwareInfo.battery;
      deviceData.temperature = baseData.sensorValues.temperature;
      deviceData.lux = baseData.sensorValues.lux;
      deviceData.moisture = baseData.sensorValues.moisture;
      deviceData.fertility = baseData.sensorValues.fertility;

      serviceHelper.log('trace', `Disconnect device: ${baseData.address}`);
      await device.disconnect();
      await saveDeviceData(deviceData); // Save the device data
    } catch (err) {
      serviceHelper.log('error', err.message);
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
}

exports.getFlowerCareDevices = async () => {  
  serviceHelper.log('info', 'Starting device discovery');
  const devices = await miflora.discover();
  serviceHelper.log('info', `Discovered: ${devices.length}`);

  // eslint-disable-next-line no-restricted-syntax
  for (const device of devices) {
    // eslint-disable-next-line no-await-in-loop
    await getFlowerCareData(device);
  }
}
