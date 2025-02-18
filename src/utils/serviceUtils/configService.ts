export class ConfigService {
  static getObjectConfig(key: string, field: string, defaultValue: any = null): any {
    const config = localStorage.getItem(`${key}-${field}`);
    if (!config) return defaultValue;
    try {
      return JSON.parse(config);
    } catch {
      return defaultValue;
    }
  }

  static setObjectConfig(key: string, value: any, field: string): void {
    localStorage.setItem(`${key}-${field}`, JSON.stringify(value));
  }
} 