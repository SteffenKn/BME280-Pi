import express from 'express';

import {AuthService} from './auth-service';
import {defaultConfig} from './config/config';

import {Config, Person} from './types/index';
import {Webserver} from './webserver';

export class Example {
  private webserver: Webserver;
  private authService: AuthService;

  private config: Config;

  constructor(config?: Config) {
    this.config = config ? config : defaultConfig;

    this.webserver = new Webserver(this.config.port);
    this.authService = new AuthService(this.webserver);
  }

  public hello(person: Person): string {
    const result: string = `Hello ${person.name}`;

    // tslint:disable-next-line:no-console
    console.log(result);

    return result;
  }

  public start(): void {
    this.addRoutes();

    this.webserver.start();

    if (this.config.useAuth) {
      this.authService.start();
    }
  }

  private addRoutes(): void {
    this.webserver.addGetRoute('/login-required', this.loginRequiredCheck.bind(this));
  }

  private loginRequiredCheck(_: express.Request, response: express.Response): void {
    response.status(200).json({loginRequired: this.config.useAuth});
  }
}
