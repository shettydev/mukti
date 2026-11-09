import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, type UserDocument } from '../../../schemas/user.schema';
import { normaliseTurnBudget } from '../../socratic-turn/help-controls';

/**
 * Reads and writes the per-user settings stored under `preferences` that are
 * not tied to one dialogue (Settings page, `PATCH /ai/settings`).
 *
 * @remarks
 * Other modules read these settings through this service rather than the
 * User model. The request user cannot be used for this: in local mode it is a
 * synthetic object with no preferences.
 */
@Injectable()
export class AiSettingsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * The turn budget a new dialogue starts with, or null for none. A stored
   * value outside 1-50 is treated as none.
   */
  async getDefaultTurnBudget(
    userId: string | Types.ObjectId,
  ): Promise<null | number> {
    const user = await this.userModel
      .findById(userId)
      .select('preferences.defaultTurnBudget')
      .lean();
    return normaliseTurnBudget(user?.preferences?.defaultTurnBudget);
  }

  /**
   * Saves the default turn budget for new dialogues. Null clears it. Existing
   * dialogues keep their own budget.
   */
  async setDefaultTurnBudget(
    userId: string | Types.ObjectId,
    turnBudget: null | number,
  ): Promise<null | number> {
    const value = normaliseTurnBudget(turnBudget);
    await this.userModel.updateOne(
      { _id: userId },
      value === null
        ? { $unset: { 'preferences.defaultTurnBudget': 1 } }
        : { $set: { 'preferences.defaultTurnBudget': value } },
    );
    return value;
  }
}
