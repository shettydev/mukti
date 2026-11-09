import { BullModule } from '@nestjs/bullmq';

import { QueueModule } from '../queue.module';

describe('local queue registration', () => {
  const original = process.env.MUKTI_LOCAL;
  afterEach(() => {
    if (original === undefined) delete process.env.MUKTI_LOCAL;
    else process.env.MUKTI_LOCAL = original;
    jest.restoreAllMocks();
  });

  it.each([
    ['1', true],
    ['0', false],
  ])('MUKTI_LOCAL=%s disables background Redis workers: %s', (mode, manual) => {
    process.env.MUKTI_LOCAL = mode as string;
    const register = jest.spyOn(BullModule, 'forRootAsync');
    QueueModule.forRoot();
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        extraOptions: { manualRegistration: manual },
      }),
    );
  });
});
