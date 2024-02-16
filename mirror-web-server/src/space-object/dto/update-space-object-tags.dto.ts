import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty
} from 'class-validator'
import { TAG_TYPES } from '../../tag/models/tag-types.enum'
import { ApiProperty } from '@nestjs/swagger'
import { ThirdPartyTag } from '../../tag/models/tags.schema'
import { SpaceObjectId } from '../../util/mongo-object-id-helpers'
import { IsUniqueTags } from '../../util/validators/unique-tags.validator'

export class UpdateSpaceObjectTagsDto {
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty()
  spaceObjectId: SpaceObjectId

  @IsNotEmpty()
  @IsEnum(TAG_TYPES)
  @ApiProperty({ enum: () => TAG_TYPES })
  tagType: TAG_TYPES

  @IsNotEmpty()
  @IsArray()
  @ArrayMaxSize(15)
  @IsUniqueTags()
  @ApiProperty()
  tags: string[] | ThirdPartyTag[]
}
