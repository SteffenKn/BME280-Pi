// tslint:disable: variable-name

export enum Register {
  DIG_T1 = 0x88, // Bme280_TEMP_PRESS_CALIB_DATA_ADDR
  DIG_T2 = 0x8A,
  DIG_T3 = 0x8C,

  DIG_P1 = 0x8E,
  DIG_P2 = 0x90,
  DIG_P3 = 0x92,
  DIG_P4 = 0x94,
  DIG_P5 = 0x96,
  DIG_P6 = 0x98,
  DIG_P7 = 0x9A,
  DIG_P8 = 0x9C,
  DIG_P9 = 0x9E,

  DIG_H1 = 0xA1,
  DIG_H2 = 0xE1, // Bme280_HUMIDITY_CALIB_DATA_ADDR
  DIG_H3 = 0xE3,
  DIG_H4 = 0xE4,
  DIG_H5 = 0xE5,
  DIG_H6 = 0xE7,

  CHIPID = 0xD0,
  VERSION = 0xD1,
  SOFTRESET = 0xE0,

  CAL26 = 0xE1,  // R calibration stored in 0xE1-0xF0

  CONTROLHUMID = 0xF2, // Bme280_CTRL_HUM_ADDR
  STATUS = 0XF3,
  CONTROL = 0xF4, // Bme280_PWR_CTRL_ADDR  Bme280_CTRL_MEAS_ADDR
  CONFIG = 0xF5, // Bme280_CONFIG_ADDR
  PRESSUREDATA = 0xF7, // Bme280_DATA_ADDR
  TEMPDATA = 0xFA, // 0xF7 to 0xFE is burst for temp, pres, and hum
  HUMIDDATA = 0xFD,
}

export enum Sampling {
  NONE = 0b000,
  X1 = 0b001,
  X2 = 0b010,
  X4 = 0b011,
  X8 = 0b100,
  X16 = 0b101,
}

export enum Filter {
   OFF = 0b000,
   X1 = 0b001,
   X2 = 0b010,
   X4 = 0b011,
   X8 = 0b100,
   X16 = 0b101,
}

// inactive duration (standby time) in normal mode
export enum Standby {
   MS_0_5 = 0b000, // 000 = 0.5 ms
   MS_62_5 = 0b001, // 001 = 62.5 ms
   MS_125 = 0b010, // 010 = 125 ms
   MS_250 = 0b011, // 011 = 250 ms
   MS_500 = 0b100, // 100 = 500 ms
   MS_1000 = 0b101, // 101 = 1000 ms
   MS_10 = 0b110, // 110 = 10 ms
   MS_20 = 0b111,  // 111 = 20 ms
}

export const ChipId: number = 0x60;
export const ResetData: number = 0xB6;
export const ForceMode: number = 0b01;
