import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoteDocument = Document & Vote;

@Schema({ collection: 'votes', timestamps: true })
export class Vote {
  // Virtual fields
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({ index: true, required: true, type: Types.ObjectId })
  targetId: Types.ObjectId;

  @Prop({
    enum: ['resource', 'technique'],
    index: true,
    required: true,
    type: String,
  })
  targetType: string;

  updatedAt: Date;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
  @Prop({
    enum: [-1, 1],
    required: true,
    type: Number,
  })
  value: number; // -1 for downvote, 1 for upvote
}

export const VoteSchema = SchemaFactory.createForClass(Vote);

// Compound unique index - one vote per user per target
VoteSchema.index({ targetId: 1, targetType: 1, userId: 1 }, { unique: true });

// Index for finding votes by target
VoteSchema.index({ targetId: 1, targetType: 1 });

// Index for user's voting history
VoteSchema.index({ createdAt: -1, userId: 1 });

// Virtual for user population
VoteSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Static method to get vote summary for a target
VoteSchema.statics.getVoteSummary = async function (
  targetType: string,
  targetId: Types.ObjectId,
) {
  const result = await this.aggregate([
    {
      $match: {
        targetId,
        targetType,
      },
    },
    {
      $group: {
        _id: null,
        downvotes: {
          $sum: {
            $cond: [{ $eq: ['$value', -1] }, 1, 0],
          },
        },
        totalVotes: { $sum: 1 },
        upvotes: {
          $sum: {
            $cond: [{ $eq: ['$value', 1] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (result.length === 0) {
    return { downvotes: 0, score: 0, totalVotes: 0, upvotes: 0 };
  }

  const { downvotes, totalVotes, upvotes } = result[0];
  return {
    downvotes,
    score: upvotes - downvotes,
    totalVotes,
    upvotes,
  };
};

// Static method to get user's vote for a target
VoteSchema.statics.getUserVote = function (
  userId: Types.ObjectId,
  targetType: string,
  targetId: Types.ObjectId,
) {
  return this.findOne({ targetId, targetType, userId }).exec();
};

VoteSchema.set('toJSON', { virtuals: true });
VoteSchema.set('toObject', { virtuals: true });
