import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for querying knowledge state.
 */
export class GetKnowledgeStateDto {
  @IsNotEmpty()
  @IsString()
  conceptId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;
}

/**
 * DTO for bulk knowledge state query.
 */
export class GetUserKnowledgeStatesDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}

/**
 * DTO for updating knowledge state based on a user response.
 */
export class UpdateKnowledgeStateDto {
  /**
   * ID of the concept being assessed.
   */
  @IsNotEmpty()
  @IsString()
  conceptId: string;

  /**
   * Whether the user answered correctly.
   */
  @IsBoolean()
  correct: boolean;

  /**
   * Optional custom pGuess (guess probability).
   */
  @IsNumber()
  @IsOptional()
  @Max(1)
  @Min(0)
  pGuess?: number;

  /**
   * Optional custom pInit (initial knowledge probability).
   * If provided, overrides the default for this concept.
   */
  @IsNumber()
  @IsOptional()
  @Max(1)
  @Min(0)
  pInit?: number;

  /**
   * Optional custom pLearn (learning rate).
   */
  @IsNumber()
  @IsOptional()
  @Max(1)
  @Min(0)
  pLearn?: number;

  /**
   * Optional custom pSlip (slip probability).
   */
  @IsNumber()
  @IsOptional()
  @Max(1)
  @Min(0)
  pSlip?: number;

  /**
   * ID of the user who is answering.
   */
  @IsNotEmpty()
  @IsString()
  userId: string;
}
