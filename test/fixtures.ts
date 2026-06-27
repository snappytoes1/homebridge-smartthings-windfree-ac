import type { SmartThingsDevice, SmartThingsDeviceStatus } from '../src/types.js';

export const airConditionerDevice: SmartThingsDevice = {
  deviceId: '88270343-0a0f-d7b3-fa66-c98918e20776',
  label: 'Air Conditioner',
  name: 'Samsung-Room-Air-Conditioner',
  type: 'OCF',
  ocf: {
    deviceType: 'oic.d.airconditioner',
    manufacturerName: 'Samsung Electronics',
    modelNumber: 'TP2X_RAC_20K',
  },
  components: [
    {
      id: 'main',
      capabilities: [
        { id: 'switch' },
        { id: 'airConditionerMode' },
      ],
    },
    {
      id: 'custom',
      capabilities: [
        { id: 'thermostatCoolingSetpoint' },
        { id: 'temperatureMeasurement' },
        { id: 'airConditionerFanMode' },
        { id: 'custom.airConditionerOptionalMode' },
        { id: 'custom.autoCleaningMode' },
        { id: 'fanOscillationMode' },
        { id: 'samsungce.airConditionerLighting' },
      ],
    },
  ],
};

export const thermostatStatus: SmartThingsDeviceStatus = {
  components: {
    main: {
      switch: {
        switch: { value: 'on' },
      },
      airConditionerMode: {
        airConditionerMode: { value: 'cool' },
      },
      thermostatCoolingSetpoint: {
        coolingSetpoint: { value: 24 },
      },
      temperatureMeasurement: {
        temperature: { value: 26 },
      },
      airConditionerFanMode: {
        fanMode: { value: 'medium' },
      },
    },
  },
};
