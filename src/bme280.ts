import I2cBus from 'i2c-bus';

import {defaultConfig} from './default-config';

import {
  Calibration,
  ChipId,
  Config,
  Filter,
  ForceMode,
  Register,
  ResetData,
  Sampling,
  Standby,
} from './types/index';

export * from './types/config';

export default class BME280 {
  private config: Config;

  private i2cBus: I2cBus.PromisifiedBus;
  private calibration: Calibration;

  constructor(config?: Config) {
    this.config = config ? config : defaultConfig;
  }

  public async initialize(): Promise<void> {
    this.i2cBus = await I2cBus.openPromisified(this.config.bus);

    try {
      await this.readChipId();
    } catch (error) {
      throw new Error(`Could not initialize i2c device on bus ${this.config.bus} with address ${this.config.i2cAdress}: ${error}`);
    }

    await this.writeRegister(Register.SOFTRESET, ResetData);

    // As per data sheet, startup time is 2 ms.
    await this.wait(4);
    this.calibration = await this.getCalibration();
    this.setSampling();

    while (await this.isReadingCalibration()) {
      await this.wait(112);
    }
  }

  public async getPressure(): Promise<number> {
    await this.wakeDeviceUp();

    // read the entire data block at once and pry out the values as we need them
    const meassurementResult: Buffer = await this.readRegisters(Register.PRESSUREDATA, 6);

    const tFine: number = this.calculateTFine(this.uint20(meassurementResult[3], meassurementResult[4], meassurementResult[5]));
    const temperature: number = this.calculateTemperature(tFine);

    const pressure: number =
      this.calculatePressure(this.uint20(meassurementResult[0], meassurementResult[1], meassurementResult[2]), tFine, temperature);

    return pressure;
  }

  public async getTemperature(): Promise<number> {
    await this.wakeDeviceUp();

    // read the entire data block at once and pry out the values as we need them
    const meassurementResult: Buffer = await this.readRegisters(Register.TEMPDATA, 3);

    const tFine: number = this.calculateTFine(this.uint20(meassurementResult[0], meassurementResult[1], meassurementResult[2]));
    const temperature: number = this.calculateTemperature(tFine);

    return temperature;
  }

  public async getHumidity(): Promise<number> {
    await this.wakeDeviceUp();

    // read the entire data block at once and pry out the values as we need them
    const meassurementResult: Buffer = await this.readRegisters(Register.TEMPDATA, 5);

    const tFine: number = this.calculateTFine(this.uint20(meassurementResult[0], meassurementResult[1], meassurementResult[2]));

    const humidity: number =
      this.calculateHumidity(this.uint16(meassurementResult[3], meassurementResult[4]), tFine);

    return humidity;
  }

  private async wakeDeviceUp(): Promise<void> {
    const ctrlMeas: number = (Sampling.X1 << 5) | (Sampling.X1 << 3) | ForceMode;

    try {
      await this.writeRegister(Register.CONTROL, ctrlMeas);

      // wait until measurement has been completed,
      // otherwise we would read the values from the last measurement
      while ((await this.readRegister(Register.STATUS) & 0b1000) !== 0) {
        await this.wait(4);
      }
    } catch {
      throw new Error(`Could not wake device up.`);
    }
  }

  private async readChipId(): Promise<void> {
    const chipId: number = await this.readRegister(Register.CHIPID);

    if (chipId === ChipId) {
      return;
    }

    throw new Error(`Unexpected chip ID ${chipId.toString()}`);
  }

  private async readRegister(registerAddress: number): Promise<number> {
    const resultBuffer: Buffer = await this.readRegisters(registerAddress, 1);

    return resultBuffer.readUInt8(0);
  }

  private async readRegisters(registerAdress: number, bufferLength: number): Promise<Buffer> {
    const registerAddressToUse: number = registerAdress | 0x80;

    const buffer: Buffer = Buffer.alloc(bufferLength);

    await this.i2cBus.readI2cBlock(this.config.i2cAdress, registerAddressToUse, bufferLength, buffer);

    return buffer;
  }

  private writeRegister(registerAddress: number, data: number): Promise<void> {
    return this.i2cBus.writeByte(this.config.i2cAdress, registerAddress, data);
  }

  private async getCalibration(): Promise<Calibration> {
    const buffer: Buffer = await this.readRegisters(Register.DIG_T1, 24);

    const h1: number = await this.readRegister(Register.DIG_H1);
    const h2Buffer: Buffer = await this.readRegisters(Register.DIG_H2, 2);
    const h2: number = this.int16(h2Buffer[1], h2Buffer[0]);
    const h3: number = await this.readRegister(Register.DIG_H3);
    const h4: number = await this.readRegister(Register.DIG_H4);
    const h5: number = await this.readRegister(Register.DIG_H5);
    const h51: number = await this.readRegister(Register.DIG_H5 + 1);
    const h6: number = await this.readRegister(Register.DIG_H6);

    return {
      digT1: this.uint16(buffer[1], buffer[0]),
      digT2: this.int16(buffer[3], buffer[2]),
      digT3: this.int16(buffer[5], buffer[4]),

      digP1: this.uint16(buffer[7], buffer[6]),
      digP2: this.int16(buffer[9], buffer[8]),
      digP3: this.int16(buffer[11], buffer[10]),
      digP4: this.int16(buffer[13], buffer[12]),
      digP5: this.int16(buffer[15], buffer[14]),
      digP6: this.int16(buffer[17], buffer[16]),
      digP7: this.int16(buffer[19], buffer[18]),
      digP8: this.int16(buffer[21], buffer[20]),
      digP9: this.int16(buffer[23], buffer[22]),

      digH1: h1,
      digH2: h2,
      digH3: h3,
      digH4: (h4 << 4) | (h5 & 0xF),
      digH5: (h51 << 4) | (h5 >> 4),
      digH6: h6,
    };
  }

  private async setSampling(): Promise<void> {
    const ctrlHum: number = Sampling.X1;
    const config: number = (Standby.MS_1000 << 5) | (Filter.X1 << 3);

    const ctrlMeas: number = (Sampling.X1 << 5) | (Sampling.X1 << 3) | ForceMode;

    try {
      await this.writeRegister(Register.CONTROLHUMID, ctrlHum);
    } catch {
      throw new Error('setSampling Register.CONTROLHUMID error');
    }

    try {
      await this.writeRegister(Register.CONFIG, config);
    } catch (error) {
      throw new Error('setSampling Register.CONFIG error');
    }

    try {
      await this.writeRegister(Register.CONTROL, ctrlMeas);
    } catch (error) {
      throw new Error('setSampling Register.CONTROL error');
    }
  }

  private async isReadingCalibration(): Promise<number> {
    const status: number = await this.readRegister(Register.STATUS);

    return status & 1;
  }

  private calculateTFine(adcTemperature: number): number {
    const var1: number = ((((adcTemperature >> 3) - (this.calibration.digT1 << 1))) * this.calibration.digT2) >> 11;
    const var2: number =
      (((((adcTemperature >> 4) - this.calibration.digT1) * ((adcTemperature >> 4) - this.calibration.digT1)) >> 12) * this.calibration.digT3) >> 14;

    return var1 + var2;
  }

  private calculateTemperature(tFine: number): number {
    return Math.round(((tFine * 5 + 128) >> 8) / 10) / 10;
  }

  private calculatePressure(adcP: number, tFine: number, temperature: number): number {
    let var1: number = tFine / 2 - 64000;
    let var2: number = var1 * var1 * this.calibration.digP6 / 32768;
    var2 = var2 + var1 * this.calibration.digP5 * 2;
    var2 = var2 / 4 + this.calibration.digP4 * 65536;
    var1 = (this.calibration.digP3 * var1 * var1 / 524288 + this.calibration.digP2 * var1) / 524288;
    var1 = (1 + var1 / 32768) * this.calibration.digP1;

    // need to avoid division by zero
    if (var1 !== 0) {
      let pressure: number = 1048576 - adcP;
      pressure = ((pressure - var2 / 4096) * 6250) / var1;
      var1 = this.calibration.digP9 * pressure * pressure / 2147483648;
      var2 = pressure * this.calibration.digP8 / 32768;
      pressure = (pressure + (var1 + var2 + this.calibration.digP7) / 16) / 100;

      if (this.config.sensorElevation > 0) {
        pressure = this.getSeaLevelPressure(pressure, temperature);
      }

      return Math.round(pressure * 100) / 100;
    } else {
      throw new Error(`Could not calculatePressure`);
    }
  }

  private calculateHumidity(adcHumidity: number, tFine: number): number {
    const var1: number = tFine - 76800;
    const var2: number = (adcHumidity - (this.calibration.digH4 * 64 + this.calibration.digH5 / 16384 * var1)) *
        (this.calibration.digH2 / 65536 * (1 + this.calibration.digH6 / 67108864 * var1 * (1 + this.calibration.digH3 / 67108864 * var1)));
    const var3: number = var2 * (1 - this.calibration.digH1 * var2 / 524288);

    const humidity: number = (var3 > 100) ? 100 : (var3 < 0 ? 0 : var3);

    return Math.round(humidity * 10) / 10;
}

  private getSeaLevelPressure(pressureMb: number, temperature: number): number {
    // tslint:disable-next-line: max-line-length
    return pressureMb * Math.pow((1 - ((0.0065 * this.config.sensorElevation) / (temperature + 0.0065 * this.config.sensorElevation + 273.15))), -5.257);
  }

  private int16(msb: number, lsb: number): number {
    const value: number = this.uint16(msb, lsb);

    return value > 32767 ? (value - 65536) : value;
  }

  private uint16(msb: number, lsb: number): number {
    return msb << 8 | lsb;
  }

  private uint20(msb: number, lsb: number, xlsb: number): number {
    return ((msb << 8 | lsb) << 8 | xlsb) >> 4;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve: Function): void => {
      setTimeout(resolve, ms);
    });
  }
}
