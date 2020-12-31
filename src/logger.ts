export class Logger {
  private appName: string = 'typescript-template-repository';
  private moduleName: string;

  constructor(moduleName: string) {
      this.moduleName = moduleName;
  }

  public log(text: string): void {
      // tslint:disable-next-line: no-console
      console.log(`${this.appName} | ${this.moduleName} | ${text}`);
  }
}
