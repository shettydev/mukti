import { beforeEach, describe, expect, it } from 'bun:test';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', (): void => {
  let appController: AppController;
  let appService: AppService;

  beforeEach((): void => {
    // Arrange: Create dependencies and controller instance
    appService = new AppService();
    appController = new AppController(appService);
  });

  describe('getHello', (): void => {
    it('should return the greeting message from AppService', (): void => {
      // Act: Call the method under test
      const result: string = appController.getHello();

      // Assert: Verify the expected result
      expect(result).toBe('Hello World!');
    });
  });
});
