import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserDataController } from '../user-data.controller';

describe('UserDataController', () => {
  const service = { deleteAll: jest.fn(), deleteAccount: jest.fn() };
  const controller = new UserDataController(service as never);
  const userId = new Types.ObjectId().toString();
  const original = process.env.MUKTI_LOCAL;
  afterEach(() => {
    if (original === undefined) delete process.env.MUKTI_LOCAL;
    else process.env.MUKTI_LOCAL = original;
    jest.clearAllMocks();
  });
  it.each([undefined, {}, { confirm: 'delete' }, { confirm: true }])(
    'rejects missing or wrong confirmation %p before deleting',
    async (body) => {
      await expect(controller.deleteData(userId, body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(service.deleteAll).not.toHaveBeenCalled();
    },
  );
  it('returns deletion results in hosted mode', async () => {
    delete process.env.MUKTI_LOCAL;
    service.deleteAll.mockResolvedValue({
      success: true,
      results: [],
      failedCategories: [],
      outside: [],
    });
    expect(await controller.deleteData(userId, { confirm: 'DELETE' })).toEqual({
      success: true,
      results: [],
      failedCategories: [],
      outside: [],
    });
  });
  it('names all CLI-held data in local mode even on another active CLI', async () => {
    process.env.MUKTI_LOCAL = '1';
    service.deleteAll.mockResolvedValue({
      success: true,
      results: [],
      failedCategories: [],
      outside: [],
    });
    const result = await controller.deleteData(userId, { confirm: 'DELETE' });
    expect(result.outside.join(' ')).toContain('~/.gemini/antigravity-cli');
    expect(result.outside.join(' ')).toContain('Delete');
  });
  it('hides account deletion in local mode without touching data', async () => {
    process.env.MUKTI_LOCAL = '1';
    await expect(
      controller.deleteAccount(userId, { confirm: 'DELETE' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(service.deleteAccount).not.toHaveBeenCalled();
  });
});
